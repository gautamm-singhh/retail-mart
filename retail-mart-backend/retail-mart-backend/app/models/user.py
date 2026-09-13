from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db

ROLE_NAMES = ("Admin", "Manager", "Staff", "Customer")
USER_STATUSES = ("active", "inactive")


class Role(db.Model):
    """ERD: ROLES"""

    __tablename__ = "roles"

    role_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    role_name = db.Column(db.String(50), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship("User", back_populates="role")


class User(db.Model):
    """
    ERD: USERS (trimmed to what the Week-2 Users/Auth screens need).

    `id` is exposed as the frontend-facing string primary key (e.g. "u-003")
    so this table serializes 1:1 with src/types/user.ts's `User` interface.
    """

    __tablename__ = "users"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=True, index=True)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    phone_verified_at = db.Column(db.DateTime, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.role_id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="active")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    role = db.relationship("Role", back_populates="users")

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self) -> dict:
        """Matches src/types/user.ts -> User"""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role.role_name if self.role else None,
            "status": self.status,
            "createdAt": self.created_at.strftime("%Y-%m-%d") if self.created_at else None,
        }
