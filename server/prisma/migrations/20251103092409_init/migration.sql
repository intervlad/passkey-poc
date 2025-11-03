CREATE TABLE "WebAuthnUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credentials" JSONB NOT NULL,

    CONSTRAINT "WebAuthnUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebAuthnUser_email_key" ON "WebAuthnUser"("email");
