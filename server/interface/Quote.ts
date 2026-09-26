export default interface Quote {
    quoteId: string
    userId: string
    displayName: string
    text: string
    speaker: string
    mediaId: string | null
    mediaTitle: string | null
    location: string
    createdAt: string
}
