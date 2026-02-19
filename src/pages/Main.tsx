import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Music } from 'lucide-react'
import { useState } from 'react'
import useFileSystemAccess from "use-fs-access"
import { showDirectoryPicker, type FileOrDirectoryInfo } from "use-fs-access/core"
import { Input as MbInput, ALL_FORMATS, BlobSource, type MetadataTags } from 'mediabunny';
import type { Song } from '../models/Song'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

'use client'


export default function Main() {
    const [songs, setSongs] = useState<Song[]>([])
    const [search, setSearch] = useState('')

    const filteredSongs = songs.filter(song =>
        song.title.toLowerCase().includes(search.toLowerCase()) ||
        song.artist.toLowerCase().includes(search.toLowerCase())
    )

    const {
        files,
        openDirectory,
        expandDirectory,
        openFile,
        closeFile,
        deleteFile,
        writeFile,
        createDirectory,
        renameFile,
        copyFile,
    } = useFileSystemAccess({
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

    const setSongsFromDirectory = async () => {
        const dir = await showDirectoryPicker();
        if (dir instanceof Error) {
            console.error("Directory access error:", dir);
            return;
        }
        if (dir == null) {
            return;
        }
        const fileDirectoryHandler = await openDirectory(dir);
        const filesMap = new Map(fileDirectoryHandler?.entries());
        let songs: Song[] = [];
        
        for (const [_, file] of filesMap) {
            if (file.kind === "directory") {
                toast.info(`Began process files in directory: ${file.name}`);

                continue;
            }
            
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

            songs.push({
                id: file.name,
                title: metaData?.title || file.name,
                artist: metaData?.artist || "Unknown Artist",
                album: metaData?.album || "Unknown Album",
                duration: await input?.computeDuration() || 0,
                bitrate: Math.ceil(bitrate / 1000) || 0,
            } as Song);
        }

        toast.success(`Loaded ${songs.length} songs from directory: ${dir.name}`);

        setSongs(songs);
    }

    const formatBitRate = (song: Song) => {
        return `${Math.floor(song.bitrate)} kbps`
    }

    const formatDuration = (duration: number) => {
        const minutes = Math.floor(duration / 60);
        const seconds = `${Math.floor(duration % 60)}`.padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    return (
        <div className="w-full h-full mx-auto p-6">
            <div className='h-full flex flex-col gap-2'>
                <div className='shrink-0'>
                    <div className="flex justify-between items-center gap-2 mb-4">
                        <Music className="w-6 h-6 inline pr-1" />
                        <h1 className="text-3xl font-bold">Song Library</h1>
                        <Button onClick={setSongsFromDirectory}>Open Directory</Button>
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
                                <div className="text-center py-8 text-muted-foreground">
                                    No songs found
                                </div>
                            )}
                            {filteredSongs.length > 0 && (
                                <Table>
                                    <TableHeader className='sticky top-0'>
                                        <TableRow>
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
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </div>
    )
}