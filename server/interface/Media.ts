export type MediaType = 'SERIES' | 'MOVIE' | 'BOOK' | 'GAME' | 'OTHER'

export default interface Media {
    mediaId: string
    mediaType: MediaType
    title: string
    createdBy: string
    createdAt: string
}
