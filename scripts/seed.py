"""Create an admin account and some sample designs.

Usage (from the project root):
    python -m scripts.seed
    python -m scripts.seed --email you@example.com --password "a-strong-password"
"""

import argparse
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Product, User

SAMPLE_PRODUCTS = [
    ("Aurora Brand Kit", "Logo, colour palette and typography set for modern tech brands.", "1499.00", 25),
    ("Nebula Poster Series", "Three abstract gradient posters, print-ready at A2.", "799.00", 40),
    ("Pulse Sports Jersey", "Bold jersey template with editable team colours and numbers.", "999.00", 12),
    ("Echo Icon Pack", "120 line icons on a 24px grid, SVG and PNG.", "499.00", 100),
    ("Prism Mockup Bundle", "Device and packaging mockups with smart-object layers.", "1299.00", 4),
    ("Nova Social Templates", "30 Instagram post and story templates.", "649.00", 60),
    ("Orbit Illustration Set", "Isometric space-themed illustrations for landing pages.", "1099.00", 18),
    ("Velvet Business Cards", "Minimal business card designs, front and back.", "349.00", 0),
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default="admin@example.com")
    parser.add_argument("--password", default="admin12345")
    args = parser.parse_args()

    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == args.email.lower()))
        if admin is None:
            admin = User(email=args.email.lower(), hashed_password=hash_password(args.password))
            db.add(admin)
            print(f"Created admin {args.email}")
        else:
            print(f"Promoted existing user {args.email} to admin")
        admin.is_admin = True

        if db.scalar(select(Product.id).limit(1)) is None:
            db.add_all(
                Product(name=n, description=d, price=Decimal(p), stock=s, is_jersey="jersey" in n.lower())
                for n, d, p, s in SAMPLE_PRODUCTS
            )
            print(f"Added {len(SAMPLE_PRODUCTS)} sample designs")
        else:
            print("Products already exist; skipped sample designs")

        db.commit()


if __name__ == "__main__":
    main()
