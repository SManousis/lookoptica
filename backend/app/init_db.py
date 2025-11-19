# app/init_db.py
from app.db import engine, Base, SessionLocal
from app.models.user import User, Role, UserRole
from app.models import product  # noqa: F401  ensure product model is registered
from app.security import hash_password  # make sure this import path matches your project

from sqlalchemy.orm import Session


# 👇 SET YOUR DESIRED SUPERADMIN CREDENTIALS HERE
SUPERADMIN_EMAIL = "info@lookoptica.gr"      # ← change this
SUPERADMIN_PASSWORD = "dh87jw#68deErp08%21jK"             # ← and this
SUPERADMIN_FULL_NAME = "Look Optica Admin"   # optional


def seed_superadmin(db: Session):
  # 1) ensure superadmin role exists
  role = db.query(Role).filter(Role.name == "superadmin").first()
  if not role:
      role = Role(name="superadmin", description="Full access admin")
      db.add(role)
      db.commit()
      db.refresh(role)
      print(f"Created role 'superadmin' (id={role.id})")

  # 2) check if a user with this email exists
  user = db.query(User).filter(User.email == SUPERADMIN_EMAIL).first()

  if not user:
      # create new user
      user = User(
          email=SUPERADMIN_EMAIL,
          full_name=SUPERADMIN_FULL_NAME,
          password_hash=hash_password(SUPERADMIN_PASSWORD),
          is_active=True,
      )
      db.add(user)
      db.commit()
      db.refresh(user)
      print(f"Created superadmin user {SUPERADMIN_EMAIL} (id={user.id})")
  else:
      # update password & name in case you changed them
      user.full_name = SUPERADMIN_FULL_NAME
      user.password_hash = hash_password(SUPERADMIN_PASSWORD)
      user.is_active = True
      db.commit()
      print(f"Updated superadmin user {SUPERADMIN_EMAIL} credentials")

  # 3) ensure the user has the superadmin role
  link = (
      db.query(UserRole)
      .filter(UserRole.user_id == user.id, UserRole.role_id == role.id)
      .first()
  )
  if not link:
      link = UserRole(user_id=user.id, role_id=role.id)
      db.add(link)
      db.commit()
      print(f"Attached role 'superadmin' to {SUPERADMIN_EMAIL}")


def init_db():
  print("Creating all tables...")
  Base.metadata.create_all(bind=engine)
  print("Done.")

  # seed superadmin
  db = SessionLocal()
  try:
      seed_superadmin(db)
  finally:
      db.close()


if __name__ == "__main__":
  init_db()
