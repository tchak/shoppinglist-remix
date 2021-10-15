-- RenameIndex
ALTER INDEX "items.list_id_index" RENAME TO "items_list_id_idx";

-- RenameIndex
ALTER INDEX "lists.user_id_index" RENAME TO "lists_user_id_idx";

-- RenameIndex
ALTER INDEX "users.email_unique" RENAME TO "users_email_key";
