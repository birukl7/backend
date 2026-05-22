"""
matcher.py
----------
Core AI matching logic using sentence-transformers.
The model is loaded once at module level so it is shared across all requests
without re-initialisation overhead.
"""

import logging
from typing import Any

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model – loaded once at import time so the first request is not penalised
# ---------------------------------------------------------------------------
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

try:
    model: SentenceTransformer = SentenceTransformer(MODEL_NAME)
    logger.info("Sentence-transformer model '%s' loaded successfully.", MODEL_NAME)
except Exception as exc:  # pragma: no cover
    logger.critical("Failed to load model '%s': %s", MODEL_NAME, exc)
    raise


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compute_matches(
    resume_text: str, vacancies: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """
    Compute cosine-similarity scores between *resume_text* and every vacancy.

    Parameters
    ----------
    resume_text:
        Plain-text content of the applicant's résumé.
    vacancies:
        List of vacancy dicts.  Each dict **must** contain the keys
        ``id``, ``title``, ``description`` and may optionally contain
        ``requirements``.

    Returns
    -------
    list[dict]
        Sorted (descending by score) list of ``{"vacancy_id": …, "score": …}``
        dicts.  ``score`` is a float in ``[-1.0, 1.0]`` (cosine similarity on
        normalised embeddings), rounded to 4 decimal places.

    Notes
    -----
    * All embeddings are L2-normalised so the dot-product equals cosine sim.
    * A single ``model.encode`` call is used for both the résumé and all
      vacancy texts so the batching benefit is retained.
    """
    if not resume_text.strip():
        logger.warning("compute_matches called with empty resume_text – returning [].")
        return []

    if not vacancies:
        logger.warning("compute_matches called with no vacancies – returning [].")
        return []

    # Build a single flat string for each vacancy so the model sees a
    # coherent representation of the role.
    vacancy_texts: list[str] = []
    for v in vacancies:
        parts = [
            str(v.get("title") or "").strip(),
            str(v.get("description") or "").strip(),
            str(v.get("requirements") or "").strip(),
        ]
        vacancy_texts.append(". ".join(p for p in parts if p))

    texts = [resume_text] + vacancy_texts

    try:
        embeddings: np.ndarray = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
            batch_size=64,
        )
    except Exception as exc:
        logger.error("model.encode failed: %s", exc, exc_info=True)
        raise

    resume_emb: np.ndarray = embeddings[0]  # shape (dim,)
    vacancy_embs: np.ndarray = embeddings[1:]  # shape (n_vacancies, dim)

    # Dot-product on unit vectors == cosine similarity
    scores: list[float] = (resume_emb @ vacancy_embs.T).tolist()

    results: list[dict[str, Any]] = [
        {"vacancy_id": v["id"], "score": round(float(s), 4)}
        for v, s in zip(vacancies, scores)
    ]

    return sorted(results, key=lambda x: x["score"], reverse=True)
