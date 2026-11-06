
-- Add missing Role values
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';

-- Create missing enums
CREATE TYPE "PageKind" AS ENUM ('DOC', 'CANVAS');
CREATE TYPE "LinkAccess" AS ENUM ('RESTRICTED', 'ANYONE');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETE');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'REPLY', 'MEMBER_ADDED');

-- Add missing Page columns
ALTER TABLE "Page"
ADD COLUMN "parentId" TEXT,
ADD COLUMN "kind" "PageKind" NOT NULL DEFAULT 'DOC',
ADD COLUMN "icon" TEXT,
ADD COLUMN "cover" TEXT,
ADD COLUMN "fullWidth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "smallText" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hidePanel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "linkAccess" "LinkAccess" NOT NULL DEFAULT 'RESTRICTED',
ADD COLUMN "linkPermission" "Permission" NOT NULL DEFAULT 'VIEW',
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "publishIndex" BOOLEAN NOT NULL DEFAULT false;

-- Create Task
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "assigneeId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- Create Favorite
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- Create Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "pageId" TEXT,
    "workspaceId" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Create PageVisit
CREATE TABLE "PageVisit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageVisit_pkey" PRIMARY KEY ("id")
);

-- Create UserSettings
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "enterNewLine" BOOLEAN NOT NULL DEFAULT false,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "dateFormat" TEXT NOT NULL DEFAULT 'relative',
    "openOnStart" TEXT NOT NULL DEFAULT 'last',
    "trackRecents" BOOLEAN NOT NULL DEFAULT true,
    "notifyMentions" BOOLEAN NOT NULL DEFAULT true,
    "notifyReplies" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvites" BOOLEAN NOT NULL DEFAULT true,
    "sidebarHidden" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- Create Upload
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- Create TemplateStat
CREATE TABLE "TemplateStat" (
    "key" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TemplateStat_pkey" PRIMARY KEY ("key")
);

-- Create indexes
CREATE INDEX "Page_parentId_idx" ON "Page"("parentId");
CREATE INDEX "Task_workspaceId_status_idx" ON "Task"("workspaceId", "status");
CREATE UNIQUE INDEX "Favorite_userId_pageId_key" ON "Favorite"("userId", "pageId");
CREATE INDEX "Favorite_pageId_idx" ON "Favorite"("pageId");
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
CREATE UNIQUE INDEX "PageVisit_userId_pageId_key" ON "PageVisit"("userId", "pageId");
CREATE INDEX "PageVisit_userId_visitedAt_idx" ON "PageVisit"("userId", "visitedAt");
CREATE INDEX "Upload_pageId_idx" ON "Upload"("pageId");

-- Add foreign keys
ALTER TABLE "Page"
ADD CONSTRAINT "Page_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Page"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_assigneeId_fkey"
FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Favorite"
ADD CONSTRAINT "Favorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite"
ADD CONSTRAINT "Favorite_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PageVisit"
ADD CONSTRAINT "PageVisit_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PageVisit"
ADD CONSTRAINT "PageVisit_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserSettings"
ADD CONSTRAINT "UserSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Upload"
ADD CONSTRAINT "Upload_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
