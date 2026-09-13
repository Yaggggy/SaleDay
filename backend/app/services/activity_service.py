from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.activity import ActivityLog


def log_activity(
    db: Session,
    *,
    organization_id: str,
    sale_id: str | None,
    actor_id: str | None,
    actor_name: str | None,
    entity_type: str,
    entity_id: str | None,
    action: str,
    previous_value: dict | None = None,
    new_value: dict | None = None,
    metadata: dict | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        organization_id=organization_id,
        sale_id=sale_id,
        actor_id=actor_id,
        actor_name=actor_name,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        previous_value=previous_value,
        new_value=new_value,
        log_metadata=metadata,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    return entry
