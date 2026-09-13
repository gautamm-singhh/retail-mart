"""
Generates the PDF files behind:
  - GET /api/orders/<id>/invoice
  - GET /api/payments/<id>/receipt

Kept as plain functions returning an in-memory BytesIO buffer so the routes
stay thin - they just decide *whether* a document can be generated (e.g. a
receipt requires status "Paid") and then hand the model over here.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable

BRAND_COLOR = colors.HexColor("#4f46e5")  # matches the frontend's brand-600
MUTED_COLOR = colors.HexColor("#64748b")
BORDER_COLOR = colors.HexColor("#e2e8f0")

_styles = getSampleStyleSheet()
_title_style = ParagraphStyle(
    "DocTitle", parent=_styles["Heading1"], textColor=BRAND_COLOR, fontSize=20, spaceAfter=2
)
_muted_style = ParagraphStyle("Muted", parent=_styles["Normal"], textColor=MUTED_COLOR, fontSize=9)
_label_style = ParagraphStyle(
    "Label", parent=_styles["Normal"], textColor=MUTED_COLOR, fontSize=8, spaceAfter=2
)
_value_style = ParagraphStyle("Value", parent=_styles["Normal"], fontSize=10)
_footer_style = ParagraphStyle("Footer", parent=_styles["Normal"], textColor=MUTED_COLOR, fontSize=8)


def _money(amount) -> str:
    return f"Rs. {float(amount):,.2f}"


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
    header_table = Table(
        [
            [Paragraph("Retail Mart", _title_style), Paragraph(title, _title_style)],
            [
                Paragraph("Admin Console", _muted_style),
                Paragraph(f"No. {doc_number}<br/>{doc_date}", _muted_style),
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
    rows = []
    for label, value in pairs:
        rows.append(Paragraph(label, _label_style))
        rows.append(Paragraph(value, _value_style))
        rows.append(Spacer(1, 6))
    return rows


def build_invoice_pdf(order) -> BytesIO:
    """`order` is an app.models.order.Order instance."""
    buffer = BytesIO()
    doc = _base_doc(buffer)
    story = _header("INVOICE", order.id, order.date.strftime("%d %b %Y") if order.date else "")

    info_table = Table(
        [
            [
                Table(
                    [[p] for p in _kv_block([("BILLED TO", order.customer), ("EMAIL", order.customer_email)])],
                    colWidths=[85 * mm],
                ),
                Table(
                    [[p] for p in _kv_block(
                        [
                            ("ORDER STATUS", order.status),
                            ("PAYMENT STATUS", order.payment_status),
                        ]
                    )],
                    colWidths=[75 * mm],
                ),
            ]
        ],
        colWidths=[95 * mm, 75 * mm],
    )
    story.append(info_table)
    story.append(Spacer(1, 10))

    item_rows = [["Item", "Qty", "Unit Price", "Total"]]
    for item in order.items:
        item_rows.append(
            [item.product_name, str(item.quantity), _money(item.price), _money(item.price * item.quantity)]
        )

    items_table = Table(item_rows, colWidths=[80 * mm, 20 * mm, 35 * mm, 35 * mm])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_COLOR),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(items_table)
    story.append(Spacer(1, 10))

    total_table = Table(
        [["Total", _money(order.amount)]],
        colWidths=[135 * mm, 35 * mm],
    )
    total_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 12),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LINEABOVE", (0, 0), (-1, 0), 1, BRAND_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(total_table)
    story.append(Spacer(1, 30))
    story.append(
        Paragraph(
            "This invoice was generated automatically by Retail Mart's admin console and "
            "does not require a signature.",
            _footer_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer


def build_receipt_pdf(payment, receipt) -> BytesIO:
    """`payment` is an app.models.payment.Payment instance; `receipt` is its app.models.payment.Receipt."""
    buffer = BytesIO()
    doc = _base_doc(buffer)
    story = _header(
        "PAYMENT RECEIPT", receipt.receipt_no, receipt.issued_at.strftime("%d %b %Y") if receipt.issued_at else ""
    )

    story.extend(
        _kv_block(
            [
                ("RECEIVED FROM", payment.customer),
                ("RELATED ORDER", payment.order_id),
                ("PAYMENT METHOD", payment.method),
                ("PAYMENT DATE", payment.date.strftime("%d %b %Y") if payment.date else ""),
                ("PAYMENT ID", payment.id),
            ]
        )
    )
    story.append(Spacer(1, 10))

    amount_table = Table(
        [["Amount received", _money(receipt.amount)]],
        colWidths=[135 * mm, 35 * mm],
    )
    amount_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 13),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(amount_table)
    story.append(Spacer(1, 30))
    story.append(
        Paragraph(
            "This receipt confirms a completed payment and was generated automatically by "
            "Retail Mart's admin console.",
            _footer_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer
