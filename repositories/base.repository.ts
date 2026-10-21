import { Database } from "@/types/supabase";

export type DbClient = any;

export abstract class BaseRepository {
  protected client: DbClient;

  constructor(client?: DbClient) {
    this.client = client;
  }
}
