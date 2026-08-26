import asyncio,os
from app.db.session import SessionLocal
from app.models.admin import Admin
from app.core.security import hash_password
async def main():
    async with SessionLocal() as db:
        email=os.getenv("ADMIN_EMAIL","admin@example.com"); password=os.getenv("ADMIN_PASSWORD","admin123")
        db.add(Admin(name="مدير النظام",email=email,password_hash=hash_password(password),role="ADMIN",is_active=True)); await db.commit()
        print(f"تم إنشاء المدير: {email}")
if __name__=="__main__": asyncio.run(main())
