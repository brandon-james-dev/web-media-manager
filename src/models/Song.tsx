export interface Song {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    bitrate: number;
    albumArt: string | undefined;
}
