import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.db.database import Base
from app.models import models

print("Registered tables in Base.metadata:")
for table_name in Base.metadata.tables.keys():
    print(f"- {table_name}")

print("\nRegistered tables in models.Base.metadata:")
for table_name in models.Base.metadata.tables.keys():
    print(f"- {table_name}")
