import argparse
import io

import requests
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.routers.admin import import_yml_catalog


def main() -> None:
    parser = argparse.ArgumentParser(description="Import YML/XML catalog from URL")
    parser.add_argument("--url", required=True, help="YML/XML URL")
    args = parser.parse_args()

    response = requests.get(args.url, timeout=60)
    response.raise_for_status()

    file_obj = io.BytesIO(response.content)
    upload = UploadFile(filename=args.url.split("/")[-1] or "catalog.xml", file=file_obj)

    db: Session = SessionLocal()
    try:
        import asyncio

        result = asyncio.run(import_yml_catalog(file=upload, db=db))
        print(result.model_dump_json(indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
