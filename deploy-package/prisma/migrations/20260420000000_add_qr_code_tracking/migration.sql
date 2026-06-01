-- AlterTable: Add QR code tracking fields to users table
ALTER TABLE "users" ADD "joinedViaQrCode" BIT NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD "qrCodeJoinedAt" DATETIME2;
