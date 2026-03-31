ALTER TABLE "series" RENAME TO "matches";--> statement-breakpoint
ALTER TABLE "games" RENAME COLUMN "series_id" TO "match_id";--> statement-breakpoint
ALTER TABLE "matches" RENAME COLUMN "best_of" TO "target_score";--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "games_series_id_series_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "series_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "series_winner_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "device_token";