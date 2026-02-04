from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import ImportFile, Log, ScreamingFrogUrl, Client
from app.schemas.schemas import ImportFile as ImportFileSchema
from app.services.log_parser import parse_excel_logs, parse_screaming_frog_csv

router = APIRouter(prefix="/api/imports", tags=["imports"])


@router.get("/{client_id}", response_model=List[ImportFileSchema])
def get_imports(client_id: int, db: Session = Depends(get_db)):
    """Get all import files for a client"""
    return (
        db.query(ImportFile)
        .filter(ImportFile.client_id == client_id)
        .order_by(ImportFile.imported_at.desc())
        .all()
    )


@router.post("/logs/{client_id}")
async def upload_logs(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload Googlebot logs Excel file"""
    # Verify client exists
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Read file
    content = await file.read()

    # Parse logs
    try:
        logs = parse_excel_logs(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    if not logs:
        raise HTTPException(status_code=400, detail="No valid logs found in file")

    # Create import record
    import_file = ImportFile(
        client_id=client_id,
        filename=file.filename,
        file_type="logs"
    )
    db.add(import_file)
    db.commit()
    db.refresh(import_file)

    # Insert logs
    for log_data in logs:
        log = Log(
            file_id=import_file.id,
            client_id=client_id,
            **log_data
        )
        db.add(log)

    db.commit()

    return {
        "message": f"Successfully imported {len(logs)} logs",
        "file_id": import_file.id,
        "logs_count": len(logs)
    }


@router.post("/screaming-frog/{client_id}")
async def upload_screaming_frog(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload Screaming Frog CSV export"""
    # Verify client exists
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Read file
    content = await file.read()

    # Parse CSV
    try:
        urls = parse_screaming_frog_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    if not urls:
        raise HTTPException(status_code=400, detail="No valid URLs found in file")

    # Delete existing SF data for this client (replace mode)
    db.query(ScreamingFrogUrl).filter(ScreamingFrogUrl.client_id == client_id).delete()

    # Create import record
    import_file = ImportFile(
        client_id=client_id,
        filename=file.filename,
        file_type="screaming_frog"
    )
    db.add(import_file)
    db.commit()
    db.refresh(import_file)

    # Insert URLs
    for url_data in urls:
        sf_url = ScreamingFrogUrl(
            file_id=import_file.id,
            client_id=client_id,
            **url_data
        )
        db.add(sf_url)

    db.commit()

    return {
        "message": f"Successfully imported {len(urls)} URLs",
        "file_id": import_file.id,
        "urls_count": len(urls)
    }


@router.delete("/{file_id}")
def delete_import(file_id: int, db: Session = Depends(get_db)):
    """Delete an import file and its associated data"""
    import_file = db.query(ImportFile).filter(ImportFile.id == file_id).first()
    if not import_file:
        raise HTTPException(status_code=404, detail="Import file not found")

    # Delete associated data
    if import_file.file_type == "logs":
        db.query(Log).filter(Log.file_id == file_id).delete()
    elif import_file.file_type == "screaming_frog":
        db.query(ScreamingFrogUrl).filter(ScreamingFrogUrl.file_id == file_id).delete()

    db.delete(import_file)
    db.commit()

    return {"message": "Import deleted"}
