export function isReaderAccount(me) {
  return Boolean(me?.reader_profile);
}

export function createFavoriteBookIds(data = {}) {
  return new Set((data.books || []).map((book) => book.id).filter((id) => Number.isInteger(id) && id > 0));
}

export function createFollowedBookstoreIds(data = {}) {
  return new Set((data.bookstores || []).map((bookstore) => bookstore.id).filter((id) => Number.isInteger(id) && id > 0));
}

export function toggleFavoriteBookId(ids, itemId, isFavorite) {
  const nextIds = new Set(ids);
  if (isFavorite) {
    nextIds.add(itemId);
  } else {
    nextIds.delete(itemId);
  }
  return nextIds;
}
