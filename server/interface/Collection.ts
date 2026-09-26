export interface Collection {
    collectionId: string
    name: string
    createdBy: string
    createdAt: string
    itemCount: number
    lastAddedAt: string | null
}

export interface CollectionItem {
    itemId: string
    collectionId: string
    url: string
    note: string
    userId: string
    displayName: string
    createdAt: string
}
