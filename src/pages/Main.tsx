import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Music, FileMusicIcon, CogIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import useFileSystemAccess from "use-fs-access"
import type { Song } from '../models/Song'
import { Link } from 'react-router'
import { showDirectoryPicker, type FileOrDirectoryInfo } from "use-fs-access/core"
import { Input as MbInput, ALL_FORMATS, BlobSource, type MetadataTags } from 'mediabunny'
import { resizePicture } from '@/lib/utils'
import { get, set } from 'idb-keyval'

'use client'

export default function Main() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [totalSongs, setTotalSongs] = useState<number>(0);
    const [search, setSearch] = useState('');

    const buffer = useRef<Song[]>([]);

    const filteredSongs = songs.filter(song =>
        song.title.toLowerCase().includes(search.toLowerCase()) ||
        song.artist.toLowerCase().includes(search.toLowerCase())
    );

    const addSong = (song: Song) => {
        buffer.current.push(song);

        if (buffer.current.length === 1) {
            requestAnimationFrame(() => {
                setSongs(prev => [...prev, ...buffer.current]);
                buffer.current = [];
            });
        }
    }

    const { openDirectory } = useFileSystemAccess({
        filters: [
        // - gitIgnoreFilter, (apply .gitignore rules)
        // - gitFolderFilter, (excludes .git folder)
        // - distFilter       (excludes node_modules, dist, ...)
        // - defaultFilters,  (includes .git folder and .gitignore filters by default)
        ],
        enableFileWatcher: true,
        fileWatcherOptions: {
            debug: true,
            pollInterval: 250, // [ms]
            // batchSize: 50, [ms]
            // cacheTime: 5000, [ms]
        },
        // FILE WATCHER CALLBACKS
        onFilesAdded: (newFiles: Map<string, FileOrDirectoryInfo>) => {}, // - Track when new files are added
        onFilesDeleted: (deletedFiles: Map<string, FileOrDirectoryInfo>) => {}, // - Track when files are deleted
        onFilesModified: (modifiledFiles: Map<string, FileOrDirectoryInfo>) => {}, // - Track when files are modified
    });

    const selectDirectory = async () => {
        const dir = await showDirectoryPicker();

        if (dir instanceof Error) {
            console.error("Directory access error:", dir);
            return;
        }
        if (dir == null) {
            return;
        }

        try {
            set('root-directory', dir);

            await loadSongsFromDirectory(dir);
        } catch (error) {
            console.log(error);
        }
    }

    const loadSongsFromDirectory = async (dir: FileSystemDirectoryHandle) => {
        const files = await openDirectory(dir);
        const filesMap = new Map(files?.entries());

        if (dir == null) {
            toast.error("No directory selected");
            return;
        }
        
        const filesInDirectory = Array.from(filesMap.values()).filter(fd => fd.kind === "file");
        setTotalSongs(filesInDirectory.length);

        for (const file of filesInDirectory) {
            const blob = await dir.getFileHandle(file.name).then(handle => handle.getFile());

            const input = new MbInput({
                formats: ALL_FORMATS,
                source: new BlobSource(blob),
            });
            
            try {
                const format = await input.getFormat();
                
                if (!format?.mimeType.startsWith("audio/")) {
                    continue;
                }
            } catch (error) {
                console.warn(`Failed to determine format for ${file.name}:`, error);
                continue;
            }

            let metaData: MetadataTags | null = null;

            try {
                metaData = await input.getMetadataTags();
            } catch (error) {
                console.warn(`Failed to read metadata for ${file.name}:`, error);
                continue;
            }

            let bitrate = 0;

            try {
                const audioTrack = await input?.getPrimaryAudioTrack();
                const packetStats = await audioTrack?.computePacketStats();
                bitrate = packetStats?.averageBitrate || 0;
            } catch (error) {
                console.warn(`Failed to compute bitrate for ${file.name}:`, error);
                continue;
            }

            const pic = metaData.images?.[0];
            let albumArtB64: string | undefined;

            if (pic != null) {
                albumArtB64 = await resizePicture(new Uint8Array(pic.data), pic.mimeType);
            }

            addSong({
                id: file.name,
                title: metaData?.title || file.name,
                artist: metaData?.artist || "Unknown Artist",
                album: metaData?.album || "Unknown Album",
                duration: await input?.computeDuration() || 0,
                bitrate: Math.ceil(bitrate / 1000) || 0,
                albumArt: albumArtB64,
            } as Song);
            console.log(`Loaded ${filesMap.size} songs from directory: ${dir.name}`);
        }

        toast.success(`Loaded ${filesMap.size} songs from directory: ${dir.name}`);
    }

    const formatBitRate = (song: Song) => {
        return `${Math.floor(song.bitrate)} kbps`
    }

    const formatDuration = (duration: number) => {
        const minutes = Math.floor(duration / 60);
        const seconds = `${Math.floor(duration % 60)}`.padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    const didRun = useRef(false);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        const init = async () => {
            const directoryHandle = await get<FileSystemDirectoryHandle>('root-directory');

            if (directoryHandle == null) {
                return;
            }

            await loadSongsFromDirectory(directoryHandle);
        };

        init();
    }, []);

    return (
        <div className="w-full h-full mx-auto px-6 pt-4 pb-2">
            <div className='h-full flex flex-col gap-2'>
                <div className='shrink-0'>
                    <div className="flex justify-between items-center gap-2 mb-4">
                        <Music className="w-6 h-6 inline pr-1" />
                        <h1 className="text-3xl font-bold">Song Library</h1>
                        <div>
                            <Link to="/settings">
                                <Button variant="outline" className="ml-2">
                                    <CogIcon />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className='flex justify-center'>
                        <Input
                            placeholder="Search songs or artists..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-sm-full max-w-4xl"
                        />
                    </div>
                </div>
                <div className='flex-1 overflow-auto'>
                    <div className='h-full container-type-size'>
                        <ScrollArea className='container-height'>
                            {filteredSongs.length === 0 && (
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <FileMusicIcon />
                                        </EmptyMedia>
                                        <EmptyTitle>No Songs Yet</EmptyTitle>
                                        <EmptyDescription>
                                            You haven&apos;t imported any songs yet. Get started by importing
                                            your songs from your chosen directory.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent className="flex-row justify-center gap-2">
                                        <Button onClick={selectDirectory}>Import Songs</Button>
                                    </EmptyContent>
                                </Empty>
                            )}
                            {filteredSongs.length > 0 && (
                                <Table stickyHeader={true}>
                                    <TableHeader>
                                        <TableRow className='sticky top-0 z-10 bg-background hover:bg-background'>
                                            <TableHead>Album Art</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Artist</TableHead>
                                            <TableHead>Album</TableHead>
                                            <TableHead>Bit Rate</TableHead>
                                            <TableHead>Duration</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSongs.map(song => (
                                            <TableRow key={song.id}>
                                                <TableCell>
                                                    {song.albumArt ? (
                                                        <img src={song.albumArt} alt={`${song.title} Album Art`} className="w-12 h-12 object-cover rounded" />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                                            <Music className="w-6 h-6 text-gray-500" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{song.title}</TableCell>
                                                <TableCell>{song.artist}</TableCell>
                                                <TableCell>{song.album}</TableCell>
                                                <TableCell>{formatBitRate(song)}</TableCell>
                                                <TableCell>{formatDuration(song.duration)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                            <ScrollBar orientation="horizontal" />
                            <ScrollBar orientation="vertical" />
                        </ScrollArea>
                    </div>
                </div>
                <div className='shrink-0'>
                    <div className='flex items-center gap-2'>
                        <Progress value={songs.length / totalSongs * 100} max={100} className="w-30" />
                        <label className="text-sm text-muted-foreground">Loaded {songs.length} of {totalSongs} items</label>
                    </div>
                </div>
            </div>
        </div>
    )
}