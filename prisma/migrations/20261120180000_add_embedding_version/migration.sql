ALTER TABLE "Media" ADD COLUMN "embeddingVersion" TEXT;
ALTER TABLE "SearchQuery" ADD COLUMN "embeddingVersion" TEXT;

UPDATE "Media" SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE "SearchQuery" SET embedding = NULL WHERE embedding IS NOT NULL;

CREATE INDEX "Media_embeddingVersion_idx" ON "Media"("embeddingVersion");
CREATE INDEX "SearchQuery_embeddingVersion_idx" ON "SearchQuery"("embeddingVersion");
