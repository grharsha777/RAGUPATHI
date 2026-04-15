"""ChromaDB vector store for incident RAG."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import chromadb
import structlog
from chromadb.api.models.Collection import Collection

from config.settings import Settings, get_settings

logger = structlog.get_logger(__name__)


class ChromaIncidentStore:
    """Persist and query incident narratives for retrieval-augmented workflows."""

    def __init__(self, settings: Settings) -> None:
        """Initialize a persistent Chroma client and collection.

        Args:
            settings: Application settings including persistence path.
        """
        self._settings = settings
        self._client = chromadb.PersistentClient(path=settings.chroma_persist_directory)
        self._collection: Collection = self._client.get_or_create_collection(
            name=settings.chroma_collection_incidents,
            metadata={"description": "RAGHUPATI incident embeddings"},
        )

    def upsert_incident_text(
        self,
        *,
        repo_full_name: str,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Insert or update a document for a repository incident.

        Args:
            repo_full_name: GitHub repository key.
            text: Incident description or postmortem narrative.
            metadata: Additional filterable metadata.

        Returns:
            Chroma document id.

        Raises:
            RuntimeError: When Chroma operations fail.
        """
        doc_id = str(uuid4())
        payload_meta: dict[str, Any] = {"repo_full_name": repo_full_name}
        if metadata:
            payload_meta.update(metadata)
        try:
            self._collection.add(
                ids=[doc_id],
                documents=[text],
                metadatas=[payload_meta],
            )
        except Exception as exc:
            logger.exception("chroma_upsert_failed", repo=repo_full_name, error=str(exc))
            msg = "Failed to upsert incident into Chroma"
            raise RuntimeError(msg) from exc
        return doc_id

    def query_similar(self, query: str, *, n_results: int = 5) -> list[dict[str, Any]]:
        """Retrieve similar past incidents for analyst augmentation.

        Args:
            query: Natural language query.
            n_results: Number of nearest neighbors.

        Returns:
            List of result dictionaries with documents and metadata.

        Raises:
            RuntimeError: When Chroma query fails.
        """
        try:
            raw = self._collection.query(query_texts=[query], n_results=n_results)
        except Exception as exc:
            logger.exception("chroma_query_failed", error=str(exc))
            msg = "Failed to query Chroma collection"
            raise RuntimeError(msg) from exc
        results: list[dict[str, Any]] = []
        documents = raw.get("documents") or []
        metadatas = raw.get("metadatas") or []
        distances = raw.get("distances") or []
        if not documents or not documents[0]:
            return results
        for idx, doc in enumerate(documents[0]):
            item: dict[str, Any] = {"document": doc}
            if metadatas and metadatas[0] and idx < len(metadatas[0]):
                item["metadata"] = metadatas[0][idx]
            if distances and distances[0] and idx < len(distances[0]):
                item["distance"] = distances[0][idx]
            results.append(item)
        return results


def get_chroma_store() -> ChromaIncidentStore:
    """Return a configured Chroma incident store.

    Returns:
        ``ChromaIncidentStore`` bound to current settings.
    """
    return ChromaIncidentStore(get_settings())
