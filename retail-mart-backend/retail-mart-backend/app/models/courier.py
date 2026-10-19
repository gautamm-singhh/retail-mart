from datetime import datetime
from app.extensions import db

class Courier(db.Model):

    __tablename__ = "couriers"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    code = db.Column(db.String(40), unique=True, nullable=False)      
    contact_email = db.Column(db.String(150), nullable=True)
    tracking_url_template = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "contactEmail": self.contact_email,
            "trackingUrlTemplate": self.tracking_url_template,
            "isActive": self.is_active,
        }
