import os
import sys
import certifi
from pymongo import MongoClient

print('=' * 60)
print('EXAMSHIELD LIVE MONGODB ATLAS CONNECTIVITY TEST')
print('=' * 60)

from app.config import settings
print('Target URI:', settings.MONGO_URI[:40] + '...[PROTECTED]')
print('Target Database:', settings.MONGO_DB_NAME)
print('-' * 60)

try:
    print('1. Connecting to MongoDB Atlas cluster...')
    client = MongoClient(
        settings.MONGO_URI,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10000
    )
    
    print('2. Pinging Atlas cluster...')
    ping_result = client.admin.command('ping')
    print('   [OK] PING SUCCESSFUL! Result:', ping_result)
    
    db = client[settings.MONGO_DB_NAME]
    
    print('3. Inspecting database collections...')
    collections = db.list_collection_names()
    print('   Collections found:', collections)
    
    print('4. Document Counts in Atlas:')
    for col_name in ['users', 'exams', 'questions', 'attempts', 'proctoring_incidents', 'counters']:
        if col_name in collections:
            count = db[col_name].count_documents({})
            print(f'   - {col_name}: {count} documents')
        else:
            print(f'   - {col_name}: (collection not created yet)')
            
    print('5. Checking Admin User:')
    admin_user = db['users'].find_one({'email': 'mattasaiswaroop5641@gmail.com'})
    if admin_user:
        email = admin_user.get('email')
        role = admin_user.get('role')
        is_2fa = admin_user.get('is_2fa_enabled', False)
        print(f'   [OK] Admin account exists: {email} (Role: {role}, 2FA Active: {is_2fa})')
    else:
        print('   Admin account not found in Atlas yet. Seeding data...')
        from app.utils.seed_data import seed_database
        seed_database()
        print('   [OK] Database seeded successfully into Atlas!')

    print('=' * 60)
    print('LIVE ATLAS STATUS: 100% CONNECTED AND OPERATIONAL!')
    print('=' * 60)

except Exception as e:
    print('=' * 60)
    print('CONNECTION ATTEMPT RESULT: FAILED')
    print('=' * 60)
    print('Error details:', str(e))
    if 'SSL handshake failed' in str(e) or 'TLSV1_ALERT_INTERNAL_ERROR' in str(e) or 'timed out' in str(e) or 'ServerSelectionTimeoutError' in str(e):
        print('\nDIAGNOSIS:')
        print('Atlas firewall rejected the connection.')
        print('Check if 0.0.0.0/0 IP is confirmed and Active in Atlas Network Access.')
