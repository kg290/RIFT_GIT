"""
WhistleChain -- Publication Bot Service
=========================================
Auto-publishes verified evidence to multiple platforms simultaneously.
For the hackathon demo, all publications are simulated/logged — no real
API keys needed for Twitter, Telegram, etc.

Publication is triggered automatically after evidence is verified.
The bot creates publication records showing what WOULD be published
to each platform in production.

Platforms:
  - Twitter (@WhistleChainIndia)
  - Telegram (subscriber channel)
  - Email (media houses + government agencies)
  - RTI Portal (auto-filed)
"""

import time
from typing import Optional

# In-memory publication records
_publication_records: dict[str, dict] = {}
_publication_queue: list[dict] = []

# Simulated media/government contacts
MEDIA_CONTACTS = [
    {"name": "The Hindu", "email": "investigations@thehindu.co.in", "type": "media"},
    {"name": "Times of India", "email": "newsdesk@timesofindia.com", "type": "media"},
    {"name": "NDTV", "email": "newsdesk@ndtv.com", "type": "media"},
]

GOVERNMENT_CONTACTS = [
    {"name": "Central Vigilance Commission", "email": "cvc@nic.in", "type": "government"},
    {"name": "CBI Complaints", "email": "complaint@cbi.gov.in", "type": "government"},
]

# Category-specific government contacts
CATEGORY_CONTACTS = {
    "FINANCIAL": [
        {"name": "Income Tax Dept", "email": "complaints@incometax.gov.in", "type": "government"},
    ],
    "CONSTRUCTION": [
        {"name": "PWD Department", "email": "pwddept@gov.in", "type": "government"},
        {"name": "MoHUA Ministry", "email": "mohua@gov.in", "type": "government"},
    ],
    "FOOD": [
        {"name": "FSSAI", "email": "complaints@fssai.gov.in", "type": "government"},
    ],
    "ACADEMIC": [
        {"name": "UGC", "email": "complaints@ugc.ac.in", "type": "government"},
    ],
}


def publish_to_all_platforms(
    evidence_id: str,
    category: str,
    organization: str,
    description: str,
    ipfs_hash: str,
    verdict: str,
    confidence: float = 0,
    tx_id: str = None,
    block: int = None,
) -> dict:
    """
    Simultaneously publish evidence to all platforms.
    In hackathon demo, this creates simulated publication records.
    In production, this would call actual APIs.
    """
    if evidence_id in _publication_records:
        return {
            "error": "Evidence already published",
            "existing": _publication_records[evidence_id],
        }

    cat = category.upper()
    timestamp = time.strftime("%d %b %Y %H:%M IST")
    ipfs_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"

    # Build Twitter post
    twitter_post = _build_twitter_post(
        evidence_id, cat, organization, ipfs_hash, timestamp, block
    )

    # Build Telegram post
    telegram_post = _build_telegram_post(
        evidence_id, cat, organization, description, ipfs_url, timestamp
    )

    # Build email notifications
    contacts = MEDIA_CONTACTS + GOVERNMENT_CONTACTS + CATEGORY_CONTACTS.get(cat, [])
    email_notifications = _build_email_notifications(
        evidence_id, cat, organization, description, ipfs_url, contacts
    )

    # Build RTI filing
    rti_filing = _build_rti_filing(evidence_id, cat, organization, description)

    publication = {
        "evidence_id": evidence_id,
        "category": cat,
        "organization": organization,
        "published_at": timestamp,
        "published_timestamp": int(time.time()),
        "status": "PUBLISHED",
        "platforms": {
            "twitter": {
                "status": "posted",
                "handle": "@WhistleChainIndia",
                "post": twitter_post,
                "url": f"https://twitter.com/WhistleChainIndia/status/simulated_{evidence_id}",
            },
            "telegram": {
                "status": "posted",
                "channel": "WhistleChain India (50,000 subscribers)",
                "post": telegram_post,
            },
            "email": {
                "status": "sent",
                "recipients": email_notifications,
                "total_sent": len(email_notifications),
            },
            "rti": {
                "status": "filed",
                "reference": rti_filing["reference"],
                "details": rti_filing,
            },
        },
        "ipfs_url": ipfs_url,
        "ipfs_hash": ipfs_hash,
        "evidence_tx": tx_id,
        "summary": {
            "platforms_reached": 4,
            "media_houses_notified": sum(1 for c in contacts if c["type"] == "media"),
            "government_agencies_notified": sum(1 for c in contacts if c["type"] == "government"),
            "censorship_resistant": True,
            "message": (
                f"Evidence {evidence_id} published to 4+ platforms, "
                f"{sum(1 for c in contacts if c['type'] == 'media')} media houses, "
                f"{sum(1 for c in contacts if c['type'] == 'government')} government agencies "
                f"— simultaneously. Cannot be removed from all simultaneously."
            ),
        },
    }

    _publication_records[evidence_id] = publication
    return publication


def schedule_publication(
    evidence_id: str,
    delay_seconds: int = 86400,  # 24 hours default for Track 2
    category: str = "",
    organization: str = "",
    description: str = "",
    ipfs_hash: str = "",
) -> dict:
    """
    Schedule evidence for auto-publication after a delay.
    Used for Track 2 (physical evidence) — 24-hour challenge window.
    """
    publish_at = int(time.time()) + delay_seconds
    scheduled = {
        "evidence_id": evidence_id,
        "scheduled_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "publish_at": publish_at,
        "publish_at_formatted": time.strftime(
            "%d %b %Y %H:%M IST", time.localtime(publish_at)
        ),
        "delay_seconds": delay_seconds,
        "delay_hours": delay_seconds / 3600,
        "status": "SCHEDULED",
        "category": category,
        "organization": organization,
        "description": description,
        "ipfs_hash": ipfs_hash,
        "can_cancel_until": publish_at,
    }
    _publication_queue.append(scheduled)
    return scheduled


def cancel_scheduled_publication(evidence_id: str) -> dict:
    """Cancel a scheduled publication (only if within challenge window)."""
    for i, item in enumerate(_publication_queue):
        if item["evidence_id"] == evidence_id and item["status"] == "SCHEDULED":
            if int(time.time()) < item["can_cancel_until"]:
                item["status"] = "CANCELLED"
                return {"status": "cancelled", "evidence_id": evidence_id}
            else:
                return {"error": "Challenge window expired, cannot cancel"}
    return {"error": "No scheduled publication found"}


def check_pending_publications() -> list[dict]:
    """Check for publications that are due (past their publish_at time)."""
    now = int(time.time())
    due = []
    for item in _publication_queue:
        if item["status"] == "SCHEDULED" and now >= item["publish_at"]:
            due.append(item)
    return due


def get_publication(evidence_id: str) -> Optional[dict]:
    """Get publication record for an evidence item."""
    return _publication_records.get(evidence_id)


def get_all_publications() -> list[dict]:
    """Get all publication records."""
    return list(_publication_records.values())


def get_publication_queue() -> list[dict]:
    """Get the publication queue (scheduled items)."""
    return _publication_queue


def get_publication_stats() -> dict:
    """Get aggregate publication statistics."""
    total = len(_publication_records)
    scheduled = sum(1 for q in _publication_queue if q["status"] == "SCHEDULED")
    cancelled = sum(1 for q in _publication_queue if q["status"] == "CANCELLED")

    return {
        "total_published": total,
        "scheduled_pending": scheduled,
        "cancelled": cancelled,
        "total_platforms_reached": total * 4,
        "censorship_resistant": True,
    }


# ─── Internal Builders ───

def _build_twitter_post(
    evidence_id: str, category: str, organization: str,
    ipfs_hash: str, timestamp: str, block: int = None,
) -> str:
    category_emoji = {
        "FINANCIAL": "💰",
        "CONSTRUCTION": "🏗️",
        "FOOD": "🍔",
        "ACADEMIC": "🎓",
    }
    emoji = category_emoji.get(category, "🚨")

    category_label = {
        "FINANCIAL": "Financial Fraud",
        "CONSTRUCTION": "Construction Violation",
        "FOOD": "Food Safety Violation",
        "ACADEMIC": "Academic Fraud",
    }

    return (
        f"🚨 FRAUD DETECTED — {evidence_id}\n\n"
        f"{emoji} {category_label.get(category, category)}\n"
        f"🏢 Organization: {organization}\n"
        f"📅 Submitted: {timestamp}\n"
        f"🔗 Evidence: ipfs.io/ipfs/{ipfs_hash}\n\n"
        f"Verified by Algorand Smart Contract\n"
        f"{'Block: #' + str(block) if block else ''}\n"
        f"#Corruption #WhistleChain #India"
    )


def _build_telegram_post(
    evidence_id: str, category: str, organization: str,
    description: str, ipfs_url: str, timestamp: str,
) -> str:
    return (
        f"🚨 *FRAUD DETECTED — {evidence_id}*\n\n"
        f"📋 *Category:* {category}\n"
        f"🏢 *Organization:* {organization}\n"
        f"📝 *Details:* {description[:200]}{'...' if len(description) > 200 else ''}\n"
        f"📅 *Submitted:* {timestamp}\n\n"
        f"🔗 [View Evidence on IPFS]({ipfs_url})\n\n"
        f"_Verified by Algorand Smart Contract_\n"
        f"_Cannot be deleted or censored_"
    )


def _build_email_notifications(
    evidence_id: str, category: str, organization: str,
    description: str, ipfs_url: str, contacts: list[dict],
) -> list[dict]:
    notifications = []
    for contact in contacts:
        notifications.append({
            "recipient": contact["name"],
            "email": contact["email"],
            "type": contact["type"],
            "subject": f"[WhistleChain] Evidence Submission — {evidence_id} — {organization}",
            "status": "sent",
            "sent_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        })
    return notifications


def _build_rti_filing(
    evidence_id: str, category: str, organization: str, description: str,
) -> dict:
    rti_ref = f"RTI/{time.strftime('%Y')}/WC/{evidence_id.split('-')[-1]}"
    return {
        "reference": rti_ref,
        "filed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "filed",
        "category": category,
        "organization": organization,
        "description": description[:500],
        "platform": "RTI Portal (auto-filed)",
        "note": "Auto-filed RTI on behalf of anonymous submitter. "
                "Reference number stored on blockchain.",
    }
