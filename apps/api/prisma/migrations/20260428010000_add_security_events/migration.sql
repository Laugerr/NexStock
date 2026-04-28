-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_type_idx" ON "security_events"("type");
CREATE INDEX "security_events_severity_idx" ON "security_events"("severity");
CREATE INDEX "security_events_resolved_at_idx" ON "security_events"("resolved_at");
CREATE INDEX "security_events_created_at_idx" ON "security_events"("created_at");
