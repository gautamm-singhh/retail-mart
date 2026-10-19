"""
Generates the PDF files behind:
  - GET /api/orders/<id>/invoice
  - GET /api/payments/<id>/receipt

Kept as plain functions returning an in-memory BytesIO buffer so the routes
stay thin - they just decide *whether* a document can be generated (e.g. a
receipt requires status "Paid") and then hand the model over here.
"""

import os
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable

BRAND_COLOR = colors.HexColor("#059669")
BRAND_DARK = colors.HexColor("#064e3b")
BRAND_TINT = colors.HexColor("#f0fdf4")
BADGE_BG = colors.HexColor("#d1fae5")
BADGE_TEXT = colors.HexColor("#065f46")
MUTED_COLOR = colors.HexColor("#64748b")
DARK_COLOR = colors.HexColor("#0f172a")
BODY_COLOR = colors.HexColor("#334155")
BORDER_COLOR = colors.HexColor("#e2e8f0")
LIGHT_BG = colors.HexColor("#f8fafc")

_FONT_CONFIG = None


def _get_fonts():
    """
    Registers TrueType fonts (Segoe UI or Arial on Windows, DejaVu on Linux)
    so the Indian Rupee symbol (₹) is rendered cleanly without glyph corruption.
    Falls back gracefully to Helvetica / 'Rs.' if no TrueType font is accessible.
    """
    global _FONT_CONFIG
    if _FONT_CONFIG is not None:
        return _FONT_CONFIG

    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        candidates = [
            ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),
            ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ]
        for regular, bold in candidates:
            if os.path.exists(regular) and os.path.exists(bold):
                pdfmetrics.registerFont(TTFont("RM-Font", regular))
                pdfmetrics.registerFont(TTFont("RM-Font-Bold", bold))
                _FONT_CONFIG = ("RM-Font", "RM-Font-Bold", True)
                return _FONT_CONFIG
    except Exception:
        pass

    _FONT_CONFIG = ("Helvetica", "Helvetica-Bold", False)
    return _FONT_CONFIG


def _money(amount) -> str:
    return f"Rs. {float(amount):,.2f}"


def _money_sym(amount, supports_rupee: bool) -> str:
    prefix = "₹" if supports_rupee else "Rs. "
    return f"{prefix}{float(amount):,.2f}"


def _base_doc(buffer: BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )


def _header(title: str, doc_number: str, doc_date: str):
    font_reg, font_bold, _ = _get_fonts()
    title_style = ParagraphStyle(
        "DocTitle", fontName=font_bold, textColor=BRAND_COLOR, fontSize=20, spaceAfter=2
    )
    muted_style = ParagraphStyle("Muted", fontName=font_reg, textColor=MUTED_COLOR, fontSize=9)

    header_table = Table(
        [
            [Paragraph("Retail Mart", title_style), Paragraph(title, title_style)],
            [
                Paragraph("Admin Console", muted_style),
                Paragraph(f"No. {doc_number}<br/>{doc_date}", muted_style),
            ],
        ],
        colWidths=[90 * mm, 70 * mm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return [header_table, Spacer(1, 6), HRFlowable(width="100%", color=BORDER_COLOR), Spacer(1, 14)]


def _kv_block(pairs: list[tuple[str, str]]):
    font_reg, font_bold, _ = _get_fonts()
    label_style = ParagraphStyle(
        "Label", fontName=font_bold, textColor=MUTED_COLOR, fontSize=8, spaceAfter=2
    )
    value_style = ParagraphStyle("Value", fontName=font_reg, fontSize=10)

    rows = []
    for label, value in pairs:
        rows.append(Paragraph(label, label_style))
        rows.append(Paragraph(value, value_style))
        rows.append(Spacer(1, 6))
    return rows


def build_invoice_pdf(order) -> BytesIO:
    """
    Builds a professional, statutory-compliant PDF invoice:
      - Uses verified Telangana seller state configuration.
      - Displays Place of Supply (POS) and HSN codes for each item.
      - Generates 'TAX INVOICE' if seller GSTIN is verified, or 'COMMERCIAL INVOICE'
        if client GST registration is pending.
      - Bifurcates CGST + SGST (intra-state) or IGST (interstate) without altering order total.
    """
    from app.utils.tax import calculate_order_tax_breakdown, get_seller_tax_config

    font_reg, font_bold, _ = _get_fonts()
    footer_style = ParagraphStyle("Footer", fontName=font_reg, textColor=MUTED_COLOR, fontSize=8)

    seller_cfg = get_seller_tax_config()
    is_live_gst = seller_cfg["is_verified_gst"]
    doc_title = "TAX INVOICE" if is_live_gst else "COMMERCIAL INVOICE"

    # Identify customer state from linked user address if present
    dest_state = "Telangana"
    user = getattr(order, "user", None)
    if user and getattr(user, "addresses", None):
        dest_state = user.addresses[0].state

    # Historical Invoice Protection: Check for immutable order-time tax snapshot first
    from app.models.order import has_tax_snapshot_column
    tax_snapshot = None
    if "tax_snapshot" in getattr(order, "__dict__", {}):
        tax_snapshot = order.__dict__["tax_snapshot"]
    elif has_tax_snapshot_column():
        try:
            tax_snapshot = getattr(order, "tax_snapshot", None)
        except Exception:
            tax_snapshot = None

    is_snapshot_preserved = bool(tax_snapshot and isinstance(tax_snapshot, dict))
    if is_snapshot_preserved:
        breakdown = tax_snapshot
    else:
        raw_items = [
            {"productName": item.product_name, "quantity": item.quantity, "price": float(item.price)}
            for item in order.items
        ]
        breakdown = calculate_order_tax_breakdown(
            items=raw_items,
            destination_state=dest_state,
        )

    buffer = BytesIO()
    doc = _base_doc(buffer)
    story = _header(doc_title, order.id, order.date.strftime("%d %b %Y") if order.date else "")

    seller_info = [
        ("SELLER / SUPPLIER", seller_cfg["business_name"]),
        ("DISPATCH LOCATION", f"{seller_cfg['seller_state']} (State Code: {seller_cfg['seller_state_code']})"),
    ]
    if is_live_gst:
        seller_info.append(("SELLER GSTIN", seller_cfg["seller_gstin"]))
    else:
        seller_info.append(("GST REGISTRATION", "Pending Client Registration (Commercial Preview)"))

    tax_record_status = (
        "Recorded Order-Time Snapshot (Immutable)"
        if is_snapshot_preserved
        else "Informational Estimate (Legacy Order - No Snapshot Recorded)"
    )

    buyer_info = [
        ("BILLED TO", order.customer),
        ("EMAIL", order.customer_email),
        ("PLACE OF SUPPLY", f"{breakdown['destination_state']} (Code: {breakdown['destination_state_code'] or '36'})"),
        ("SUPPLY TYPE", "Intra-State (Telangana)" if breakdown["is_intra_state"] else f"Inter-State ({breakdown['destination_state']})"),
        ("TAX RECORD STATUS", tax_record_status),
    ]

    info_table = Table(
        [
            [
                Table([[p] for p in _kv_block(seller_info)], colWidths=[80 * mm]),
                Table([[p] for p in _kv_block(buyer_info)], colWidths=[80 * mm]),
            ]
        ],
        colWidths=[85 * mm, 85 * mm],
    )
    story.append(info_table)
    story.append(Spacer(1, 10))

    # Item breakdown table with HSN, Taxable Value, Tax Rate, Tax Amount, Gross Total
    item_rows = [["Item Description", "HSN", "Qty", "Taxable", "GST %", "Tax Amt", "Total"]]
    for b_item in breakdown["items"]:
        item_rows.append(
            [
                b_item["product_name"],
                b_item["hsn"],
                str(b_item["quantity"]),
                _money(b_item["taxable_value"]),
                f"{int(b_item['gst_rate'])}%",
                _money(b_item["total_tax"]),
                _money(b_item["gross_amount"]),
            ]
        )

    items_table = Table(
        item_rows,
        colWidths=[52 * mm, 18 * mm, 14 * mm, 24 * mm, 16 * mm, 22 * mm, 24 * mm],
    )
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_COLOR),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), font_bold),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(items_table)
    story.append(Spacer(1, 10))

    # Summary table with Taxable Base, CGST+SGST or IGST, and Grand Total
    summary_rows = [
        ["Total Taxable Value", _money(breakdown["taxable_value"])],
    ]
    if breakdown["is_intra_state"]:
        summary_rows.append(["Central GST (CGST)", _money(breakdown["cgst_amount"])])
        summary_rows.append(["State GST (SGST - Telangana)", _money(breakdown["sgst_amount"])])
    else:
        summary_rows.append([f"Integrated GST (IGST to {breakdown['destination_state']})", _money(breakdown["igst_amount"])])

    summary_rows.append(["Grand Total (Inclusive of All Taxes)", _money(order.amount)])

    total_table = Table(
        summary_rows,
        colWidths=[120 * mm, 50 * mm],
    )
    total_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font_reg),
                ("FONTNAME", (0, -1), (-1, -1), font_bold),
                ("FONTSIZE", (0, 0), (-1, -2), 9),
                ("FONTSIZE", (0, -1), (-1, -1), 11),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LINEABOVE", (0, -1), (-1, -1), 1, BRAND_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(total_table)
    story.append(Spacer(1, 25))

    if is_live_gst:
        disclaimer = (
            "This is an official computer-generated GST Tax Invoice issued under Section 31 of "
            "the CGST Act, 2017. Input tax credit is available to eligible registered recipients."
        )
    else:
        disclaimer = (
            "Commercial Sale Voucher: Client GST registration is pending. Tax figures are provided as "
            "statutory reverse-calculation previews from tax-inclusive selling prices. Valid without signature."
        )

    story.append(Paragraph(disclaimer, footer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer



def build_receipt_pdf(payment, receipt) -> BytesIO:
    """
    `payment` is an app.models.payment.Payment instance;
    `receipt` is its app.models.payment.Receipt instance.

    Generates a premium, trustworthy, print-safe A4 receipt with:
      - Retail Mart branding and official header
      - Real payment status badge (PAYMENT SUCCESSFUL)
      - Large prominent Amount Paid card
      - Two-column structured Customer & Order Details
      - Dedicated Payment Method section
      - Purchased items breakdown when linked order items exist
      - Professional verification and trust callout
      - Subtle corporate footer with support contact
    """
    font_reg, font_bold, supports_rupee = _get_fonts()

    buffer = BytesIO()
    # A4: 210mm x 297mm. Printable width = 210 - (18*2) = 174mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
    )

    story = []
    content_width = 174 * mm

    # 1. Header: Brand Mark, Document Details, Status Badge
    brand_logo_style = ParagraphStyle(
        "BrandLogo",
        fontName=font_bold,
        fontSize=18,
        leading=22,
        textColor=DARK_COLOR,
    )
    brand_sub_style = ParagraphStyle(
        "BrandSub",
        fontName=font_bold,
        fontSize=8.5,
        leading=11,
        textColor=BRAND_COLOR,
    )
    brand_meta_style = ParagraphStyle(
        "BrandMeta",
        fontName=font_reg,
        fontSize=7.5,
        leading=10,
        textColor=MUTED_COLOR,
    )

    right_num_style = ParagraphStyle(
        "RightNum",
        fontName=font_bold,
        fontSize=10.5,
        leading=13,
        textColor=DARK_COLOR,
        alignment=2,
    )
    right_date_style = ParagraphStyle(
        "RightDate",
        fontName=font_reg,
        fontSize=8,
        leading=11,
        textColor=MUTED_COLOR,
        alignment=2,
    )

    issued_date_str = (
        receipt.issued_at.strftime("%d %b %Y")
        if receipt.issued_at
        else (payment.date.strftime("%d %b %Y") if payment.date else "-")
    )

    left_header = [
        Paragraph('<b><font color="#059669">●</font> Retail Mart</b>', brand_logo_style),
        Paragraph('OFFICIAL PAYMENT RECEIPT', brand_sub_style),
        Paragraph('Electronic Transaction Voucher & Accounting Record', brand_meta_style),
    ]

    is_paid = str(payment.status).strip().lower() == "paid"
    status_label = "● PAYMENT SUCCESSFUL" if is_paid else f"● PAYMENT {payment.status.upper()}"
    status_badge_bg = BADGE_BG if is_paid else colors.HexColor("#fef3c7")
    status_badge_border = colors.HexColor("#a7f3d0") if is_paid else colors.HexColor("#fde68a")
    status_badge_text_color = BADGE_TEXT if is_paid else colors.HexColor("#92400e")

    badge_table = Table(
        [[Paragraph(f'<b><font color="{status_badge_text_color.hexval()}">{status_label}</font></b>', ParagraphStyle("Badge", fontName=font_bold, fontSize=7.5, leading=9, alignment=1))]],
        colWidths=[42 * mm],
    )
    badge_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), status_badge_bg),
                ("BOX", (0, 0), (-1, -1), 0.5, status_badge_border),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )

    right_header = [
        Paragraph(f'<b>RECEIPT NO:</b> <font color="#059669">{receipt.receipt_no}</font>', right_num_style),
        Paragraph(f'Date Issued: <b>{issued_date_str}</b>', right_date_style),
        Spacer(1, 3),
        Table([[None, badge_table]], colWidths=[28 * mm, 42 * mm], style=[("ALIGN", (1, 0), (1, 0), "RIGHT")]),
    ]

    header_table = Table(
        [[left_header, right_header]],
        colWidths=[104 * mm, 70 * mm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=BRAND_COLOR, spaceBefore=4, spaceAfter=12))

    # 2. Payment Summary: Amount Paid Card
    amount_label_style = ParagraphStyle(
        "AmtLabel",
        fontName=font_bold,
        fontSize=7.5,
        leading=10,
        textColor=MUTED_COLOR,
    )
    amount_num_style = ParagraphStyle(
        "AmtNum",
        fontName=font_bold,
        fontSize=24,
        leading=28,
        textColor=BRAND_DARK,
    )
    amount_sub_style = ParagraphStyle(
        "AmtSub",
        fontName=font_reg,
        fontSize=8.5,
        leading=11,
        textColor=BRAND_COLOR,
    )

    method_label_style = ParagraphStyle(
        "MethodLabel",
        fontName=font_bold,
        fontSize=7.5,
        leading=10,
        textColor=MUTED_COLOR,
        alignment=2,
    )
    method_val_style = ParagraphStyle(
        "MethodVal",
        fontName=font_bold,
        fontSize=12,
        leading=15,
        textColor=DARK_COLOR,
        alignment=2,
    )
    method_sub_style = ParagraphStyle(
        "MethodSub",
        fontName=font_reg,
        fontSize=8,
        leading=11,
        textColor=MUTED_COLOR,
        alignment=2,
    )

    amount_cell_left = [
        Paragraph("TOTAL AMOUNT PAID", amount_label_style),
        Spacer(1, 1),
        Paragraph(_money_sym(receipt.amount, supports_rupee), amount_num_style),
        Spacer(1, 1),
        Paragraph("&#10004; Payment completed and reconciled successfully", amount_sub_style),
    ]

    amount_cell_right = [
        Paragraph("PAYMENT METHOD", method_label_style),
        Spacer(1, 1),
        Paragraph(str(payment.method or "Razorpay"), method_val_style),
        Spacer(1, 1),
        Paragraph(f'Settlement: <font color="#059669"><b>{payment.status}</b></font>', method_sub_style),
    ]

    amount_card = Table(
        [[amount_cell_left, amount_cell_right]],
        colWidths=[114 * mm, 60 * mm],
    )
    amount_card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_TINT),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#a7f3d0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(amount_card)
    story.append(Spacer(1, 12))

    # 3. Customer and order details
    sec_title_style = ParagraphStyle(
        "SecTitle",
        fontName=font_bold,
        fontSize=9.5,
        leading=12,
        textColor=DARK_COLOR,
    )
    fld_lbl_style = ParagraphStyle(
        "FldLbl",
        fontName=font_bold,
        fontSize=7,
        leading=9,
        textColor=MUTED_COLOR,
    )
    fld_val_style = ParagraphStyle(
        "FldVal",
        fontName=font_reg,
        fontSize=9,
        leading=12,
        textColor=DARK_COLOR,
    )
    fld_val_bold_style = ParagraphStyle(
        "FldValBold",
        fontName=font_bold,
        fontSize=9,
        leading=12,
        textColor=DARK_COLOR,
    )

    story.append(Paragraph("<b>Customer & Transaction Details</b>", sec_title_style))
    story.append(Spacer(1, 4))

    order = getattr(payment, "order", None)
    customer_email = getattr(order, "customer_email", None)
    payment_date_str = payment.date.strftime("%d %b %Y") if payment.date else "-"

    details_left = [
        Paragraph("RECEIVED FROM / CUSTOMER", fld_lbl_style),
        Paragraph(str(payment.customer or "-"), fld_val_bold_style),
        Spacer(1, 5),
    ]
    if customer_email:
        details_left.extend([
            Paragraph("CUSTOMER EMAIL", fld_lbl_style),
            Paragraph(str(customer_email), fld_val_style),
            Spacer(1, 5),
        ])
    details_left.extend([
        Paragraph("PAYMENT METHOD", fld_lbl_style),
        Paragraph(str(payment.method or "Online Gateway"), fld_val_style),
    ])

    details_right = [
        Paragraph("RELATED ORDER ID", fld_lbl_style),
        Paragraph(f'<b><font color="#059669">#{payment.order_id}</font></b>', fld_val_bold_style),
        Spacer(1, 5),
        Paragraph("PAYMENT ID", fld_lbl_style),
        Paragraph(str(payment.id), fld_val_style),
        Spacer(1, 5),
        Paragraph("TRANSACTION DATE", fld_lbl_style),
        Paragraph(payment_date_str, fld_val_style),
    ]

    details_table = Table(
        [[details_left, details_right]],
        colWidths=[87 * mm, 87 * mm],
    )
    details_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("LINEBEFORE", (1, 0), (1, -1), 0.5, BORDER_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(details_table)
    story.append(Spacer(1, 12))

    # 4. Order items breakdown
    order_items = getattr(order, "items", None) or []
    if order_items:
        story.append(Paragraph("<b>Purchased Items Breakdown</b>", sec_title_style))
        story.append(Spacer(1, 4))

        th_style = ParagraphStyle(
            "Th",
            fontName=font_bold,
            fontSize=7.5,
            leading=9,
            textColor=DARK_COLOR,
        )
        th_right_style = ParagraphStyle(
            "ThRight",
            fontName=font_bold,
            fontSize=7.5,
            leading=9,
            textColor=DARK_COLOR,
            alignment=2,
        )
        td_item_style = ParagraphStyle(
            "TdItem",
            fontName=font_reg,
            fontSize=8.5,
            leading=11,
            textColor=BODY_COLOR,
        )
        td_right_style = ParagraphStyle(
            "TdRight",
            fontName=font_reg,
            fontSize=8.5,
            leading=11,
            textColor=DARK_COLOR,
            alignment=2,
        )
        td_bold_right_style = ParagraphStyle(
            "TdBoldRight",
            fontName=font_bold,
            fontSize=9.5,
            leading=12,
            textColor=BRAND_DARK,
            alignment=2,
        )

        item_rows = [
            [
                Paragraph("Item Description", th_style),
                Paragraph("Qty", th_right_style),
                Paragraph("Unit Price", th_right_style),
                Paragraph("Total", th_right_style),
            ]
        ]
        for item in order_items:
            item_rows.append(
                [
                    Paragraph(item.product_name, td_item_style),
                    Paragraph(str(item.quantity), td_right_style),
                    Paragraph(_money_sym(item.price, supports_rupee), td_right_style),
                    Paragraph(_money_sym(item.price * item.quantity, supports_rupee), td_right_style),
                ]
            )
        # Summary Row
        item_rows.append(
            [
                Paragraph("<b>Total Amount Settled</b>", ParagraphStyle("TotLbl", fontName=font_bold, fontSize=8.5, leading=11, textColor=DARK_COLOR)),
                Paragraph("", td_right_style),
                Paragraph("", td_right_style),
                Paragraph(_money_sym(receipt.amount, supports_rupee), td_bold_right_style),
            ]
        )

        items_table = Table(
            item_rows,
            colWidths=[94 * mm, 18 * mm, 31 * mm, 31 * mm],
        )
        items_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                    ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                    ("INNERGRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#f1f5f9")),
                    ("LINEABOVE", (0, -1), (-1, -1), 1, BRAND_COLOR),
                    ("BACKGROUND", (0, -1), (-1, -1), BRAND_TINT),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(items_table)
        story.append(Spacer(1, 12))

    # 5. Verification confirmation box
    trust_title_style = ParagraphStyle(
        "TrustTitle",
        fontName=font_bold,
        fontSize=8.5,
        leading=11,
        textColor=BADGE_TEXT,
    )
    trust_body_style = ParagraphStyle(
        "TrustBody",
        fontName=font_reg,
        fontSize=8,
        leading=11,
        textColor=BODY_COLOR,
    )

    trust_cell = [
        Paragraph("&#10004; Payment Confirmed & Verified", trust_title_style),
        Spacer(1, 2),
        Paragraph(
            f"This receipt confirms that the payment of <b>{_money_sym(receipt.amount, supports_rupee)}</b> "
            f"associated with order <b>#{payment.order_id}</b> was successfully processed and settled via "
            f"<b>{payment.method or 'Online Gateway'}</b>. This electronic document is issued by Retail Mart "
            f"for customer accounting, audit, and tax records.",
            trust_body_style,
        ),
    ]

    trust_table = Table([[trust_cell]], colWidths=[content_width])
    trust_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("LINEBEFORE", (0, 0), (0, -1), 3, BRAND_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(trust_table)
    story.append(Spacer(1, 10))

    # 6. Footer: Corporate disclaimer and support
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=4, spaceAfter=6))

    ft_left_style = ParagraphStyle(
        "FtLeft",
        fontName=font_reg,
        fontSize=7,
        leading=9,
        textColor=MUTED_COLOR,
    )
    ft_right_style = ParagraphStyle(
        "FtRight",
        fontName=font_reg,
        fontSize=7,
        leading=9,
        textColor=MUTED_COLOR,
        alignment=2,
    )

    footer_table = Table(
        [
            [
                Paragraph("Retail Mart Enterprise Commerce • Payment receipt generated automatically • Valid without physical signature", ft_left_style),
                Paragraph("Customer Support: <b>support@retailmart.dev</b>", ft_right_style),
            ]
        ],
        colWidths=[118 * mm, 56 * mm],
    )
    footer_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(footer_table)

    doc.build(story)
    buffer.seek(0)
    return buffer
