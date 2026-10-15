-- Live classes: scheduled video sessions, waiting room, attendance,
-- recordings, polls and Q&A.

-- CreateEnum
CREATE TYPE "LiveClassStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');
CREATE TYPE "LiveSeatStatus" AS ENUM ('WAITING', 'ADMITTED', 'DENIED', 'REMOVED');

-- CreateTable
CREATE TABLE "LiveClass" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" "LiveClassStatus" NOT NULL DEFAULT 'SCHEDULED',
    "roomName" TEXT NOT NULL,
    "waitingRoom" BOOLEAN NOT NULL DEFAULT false,
    "muteOnEntry" BOOLEAN NOT NULL DEFAULT true,
    "allowStudentUnmute" BOOLEAN NOT NULL DEFAULT true,
    "allowStudentVideo" BOOLEAN NOT NULL DEFAULT true,
    "allowStudentScreenShare" BOOLEAN NOT NULL DEFAULT false,
    "allowChat" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "captionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRecord" BOOLEAN NOT NULL DEFAULT false,
    "breakoutsOpen" BOOLEAN NOT NULL DEFAULT false,
    "breakoutCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LiveClass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveClassParticipant" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "LiveSeatStatus" NOT NULL DEFAULT 'ADMITTED',
    "breakoutRoom" INTEGER,
    "firstJoinedAt" TIMESTAMP(3),
    "sessionStartedAt" TIMESTAMP(3),
    "lastLeftAt" TIMESTAMP(3),
    "totalSeconds" INTEGER NOT NULL DEFAULT 0,
    "joinCount" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveClassParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveClassRecording" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "egressId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECORDING',
    "fileUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    CONSTRAINT "LiveClassRecording_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveClassPoll" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveClassPoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveClassPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveClassPollVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveClassQuestion" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveClassQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveClassQuestionVote" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "LiveClassQuestionVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveClass_roomName_key" ON "LiveClass"("roomName");
CREATE INDEX "LiveClass_batchId_scheduledAt_idx" ON "LiveClass"("batchId", "scheduledAt");
CREATE INDEX "LiveClass_hostId_scheduledAt_idx" ON "LiveClass"("hostId", "scheduledAt");
CREATE INDEX "LiveClass_status_scheduledAt_idx" ON "LiveClass"("status", "scheduledAt");
CREATE UNIQUE INDEX "LiveClassParticipant_liveClassId_userId_key" ON "LiveClassParticipant"("liveClassId", "userId");
CREATE INDEX "LiveClassParticipant_liveClassId_status_idx" ON "LiveClassParticipant"("liveClassId", "status");
CREATE UNIQUE INDEX "LiveClassRecording_egressId_key" ON "LiveClassRecording"("egressId");
CREATE INDEX "LiveClassRecording_liveClassId_idx" ON "LiveClassRecording"("liveClassId");
CREATE INDEX "LiveClassPoll_liveClassId_idx" ON "LiveClassPoll"("liveClassId");
CREATE UNIQUE INDEX "LiveClassPollVote_pollId_userId_key" ON "LiveClassPollVote"("pollId", "userId");
CREATE INDEX "LiveClassQuestion_liveClassId_createdAt_idx" ON "LiveClassQuestion"("liveClassId", "createdAt");
CREATE UNIQUE INDEX "LiveClassQuestionVote_questionId_userId_key" ON "LiveClassQuestionVote"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassParticipant" ADD CONSTRAINT "LiveClassParticipant_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassParticipant" ADD CONSTRAINT "LiveClassParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassRecording" ADD CONSTRAINT "LiveClassRecording_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassPoll" ADD CONSTRAINT "LiveClassPoll_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassPollVote" ADD CONSTRAINT "LiveClassPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "LiveClassPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassPollVote" ADD CONSTRAINT "LiveClassPollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassQuestion" ADD CONSTRAINT "LiveClassQuestion_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassQuestion" ADD CONSTRAINT "LiveClassQuestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassQuestionVote" ADD CONSTRAINT "LiveClassQuestionVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LiveClassQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveClassQuestionVote" ADD CONSTRAINT "LiveClassQuestionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
