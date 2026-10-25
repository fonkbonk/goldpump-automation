export type RainStatus = "pending" | "in progress" | string;

export type RainDocument = {
  _id?: string;
  status?: RainStatus;
  joinedRain?: boolean;
  endDate?: string | Date;
  evAmount?: number;
  tipAmount?: number;
};

export type StreamPayload = {
  documents?: Record<string, unknown>[];
  updates?: Array<{
    documentId: string;
    updatedFields: Record<string, unknown>;
    removedFields: string[];
  }>;
};

export type LoginAutoResponse = {
  authenticated?: boolean;
  document?: { userId?: string; username?: string; balance?: number };
  needServerSeedReroll?: boolean;
  error?: string;
};
