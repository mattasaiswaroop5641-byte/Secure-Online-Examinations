import asyncio
import pyotp
import qrcode
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def setup_admin_2fa():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    
    # Check if user already exists
    user = await db["users"].find_one({"email": "mattasaiswaroop5641@gmail.com"})
    if not user:
        print("ERROR: User mattasaiswaroop5641@gmail.com not found in MongoDB Atlas.")
        return
        
    secret = user.get("two_factor_secret")
    if not secret:
        secret = pyotp.random_base32()
    
    # Enable 2FA for this user with this secret
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"two_factor_secret": secret, "is_2fa_enabled": True}}
    )
    
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name="mattasaiswaroop5641@gmail.com",
        issuer_name="ExamShield"
    )
    
    # Generate QR Code image
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    qr_path = r"C:\Users\matta\.gemini\antigravity\brain\f2c56629-5569-4e49-82b4-b82823623f53\admin_2fa_qr.png"
    img.save(qr_path)
    
    print("--- 2FA DETAILS ---")
    print(f"SECRET_KEY: {secret}")
    print(f"ACCOUNT_NAME: mattasaiswaroop5641@gmail.com")
    print(f"ISSUER: ExamShield")
    print(f"TOTP_URI: {totp_uri}")
    print(f"QR_PATH: {qr_path}")
    print("-------------------")
    
    # Verify TOTP current code
    totp = pyotp.TOTP(secret)
    print(f"CURRENT_LIVE_CODE: {totp.now()}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_admin_2fa())
