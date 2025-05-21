const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Folder',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => { openDirectory(); }
                },
                { type: 'separator' },
                { role: 'quit', label: 'Exit' }
            ]
        },
        {
            label: 'Playback',
            submenu: [
                {
                    label: 'Play/Pause',
                    accelerator: 'Space',
                    click: () => { mainWindow.webContents.send('toggle-play'); }
                },
                {
                    label: 'Previous',
                    accelerator: 'CmdOrCtrl+Left',
                    click: () => { mainWindow.webContents.send('play-previous'); }
                },
                {
                    label: 'Next',
                    accelerator: 'CmdOrCtrl+Right',
                    click: () => { mainWindow.webContents.send('play-next'); }
                },
                { type: 'separator' },
                {
                    label: 'Rewind 10s',
                    accelerator: 'Left',
                    click: () => { mainWindow.webContents.send('seek-relative', -10); }
                },
                {
                    label: 'Forward 10s',
                    accelerator: 'Right',
                    click: () => { mainWindow.webContents.send('seek-relative', 10); }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload', label: 'Reload' },
                { role: 'toggleDevTools', label: 'Developer Tools' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Fullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function openDirectory() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const directoryPath = result.filePaths[0];
        loadDirectoryContents(directoryPath);
    }
}

async function loadDirectoryContents(directoryPath) {
    const normalizedDirectoryPath = path.normalize(directoryPath);
    try {
        const files = await readdir(normalizedDirectoryPath);
        const fileData = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(normalizedDirectoryPath, file);
                try {
                    const stats = await stat(filePath);

                    if (stats.isDirectory()) {
                        return {
                            name: file,
                            type: 'folder',
                            path: filePath
                        };
                    } else {
                        const ext = path.extname(file).toLowerCase();
                        if (['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext)) {
                            return {
                                name: file,
                                type: 'file',
                                path: filePath
                            };
                        }
                        return null;
                    }
                } catch (statError) {
                    console.error(`Error stating file ${filePath}:`, statError);
                    return null; // If stat fails, treat as non-existent or skip
                }
            })
        );

        const filteredData = fileData
            .filter(item => item !== null)
            .sort((a, b) => a.name.localeCompare(b.name));

        mainWindow.webContents.send('directory-contents', {
            path: normalizedDirectoryPath,
            files: filteredData
        });
    } catch (error) {
        console.error(`Error loading directory ${normalizedDirectoryPath}:`, error);
        mainWindow.webContents.send('error', {
            message: `Failed to load directory: ${error.message}`
        });
    }
}

async function loadAudioMetadata(filePath) {
    try {
        const mm = await import('music-metadata');
        const metadata = await mm.parseFile(filePath);

        // Extract picture data if available
        let coverBuffer = null;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            coverBuffer = metadata.common.picture[0].data;
        }

        return {
            title: metadata.common.title,
            artist: metadata.common.artist,
            album: metadata.common.album,
            duration: metadata.format.duration,
            coverBuffer: coverBuffer
        };
    } catch (error) {
        console.error('Error loading metadata:', error);
        return null;
    }
}

async function findCoverFile(audioPath) {
    const directory = path.dirname(audioPath);
    const coverPath1 = path.join(directory, 'cover.jpg');
    const coverPath2 = path.join(directory, 'cover.png');

    if (await fileExists(coverPath1)) {
        return coverPath1;
    }

    if (await fileExists(coverPath2)) {
        return coverPath2;
    }

    return null;
}

async function fileExists(filePath) {
    try {
        await stat(filePath);
        return true;
    } catch (error) {
        return false;
    }
}

async function findLrcFile(audioPath) {
    const directory = path.dirname(audioPath);
    const basename = path.basename(audioPath, path.extname(audioPath));

    const lrcPath = path.join(directory, `${basename}.lrc`);

    if (await fileExists(lrcPath)) {
        return lrcPath;
    }

    return null;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('open-directory-dialog', async () => {
    openDirectory();
});

ipcMain.on('load-directory', async (event, directoryPath) => {
    loadDirectoryContents(directoryPath);
});

ipcMain.on('load-audio', async (event, filePath) => {
    const metadata = await loadAudioMetadata(filePath);
    const lrcPath = await findLrcFile(filePath);
    const coverPath = await findCoverFile(filePath);

    let lrcContent = null;
    if (lrcPath) {
        try {
            lrcContent = await readFile(lrcPath, 'utf8');
        } catch (error) {
            console.error('Error reading LRC file:', error);
        }
    }

    // Read external cover if exists and no embedded cover
    let coverData = null;
    if (!metadata?.coverBuffer && coverPath) {
        try {
            coverData = await readFile(coverPath);
        } catch (error) {
            console.error('Error reading cover file:', error);
        }
    }

    event.reply('audio-data', {
        path: filePath,
        metadata,
        lrcContent,
        coverData
    });
});