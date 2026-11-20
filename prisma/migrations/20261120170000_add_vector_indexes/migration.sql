-- CreateIndex
CREATE INDEX "Media_embedding_hnsw_idx" ON "Media" USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);

-- CreateIndex
CREATE INDEX "SearchQuery_embedding_hnsw_idx" ON "SearchQuery" USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
