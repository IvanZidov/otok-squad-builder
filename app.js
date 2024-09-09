document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    const playerList = document.getElementById('player-list');
    const formationSelect = document.getElementById('formation');
    const previewCanvas = document.getElementById('preview-canvas');
    const ctx = previewCanvas.getContext('2d');
    const downloadImageButton = document.getElementById('download-image');

    let players = [];
    let playerSvg, goalkeeperSvg, fieldImage;
    let resourcesLoaded = false;

    // Add this constant at the top of the file, outside of any function
    const PLAYER_SIZE = 55;

    let draggedPlayer = null;

    function initializeApp() {
        console.log('Initializing app');
        if (players.length === 0) {
            addPlaceholderPlayers();
        } else {
            generateSquadPreview();
        }
        initializeDragAndDrop();
    }

    function initializeDragAndDrop() {
        const playerItems = document.querySelectorAll('#player-list div');
        playerItems.forEach(item => {
            item.setAttribute('draggable', true);
            item.addEventListener('dragstart', dragStart);
            item.addEventListener('dragover', dragOver);
            item.addEventListener('drop', drop);
        });
    }

    function dragStart(e) {
        draggedPlayer = this;
        e.dataTransfer.setData('text/plain', this.dataset.index);
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function drop(e) {
        e.preventDefault();
        if (draggedPlayer !== this) {
            const fromIndex = parseInt(draggedPlayer.dataset.index);
            const toIndex = parseInt(this.dataset.index);
            
            // Swap players in the array
            [players[fromIndex], players[toIndex]] = [players[toIndex], players[fromIndex]];
            
            // Update the DOM
            updatePlayerList();
            generateSquadPreview();
        }
    }

    function updatePlayerList() {
        playerList.innerHTML = '';
        const startingElevenHeader = document.createElement('h3');
        startingElevenHeader.textContent = 'Starting Eleven';
        startingElevenHeader.className = 'starting-eleven-header';
        playerList.appendChild(startingElevenHeader);
        
        players.forEach((player, index) => {
            if (index === 11) {
                const divider = document.createElement('hr');
                divider.className = 'player-list-divider';
                playerList.appendChild(divider);

                const substituteHeader = document.createElement('h3');
                substituteHeader.textContent = 'Substitutes';
                substituteHeader.className = 'substitute-header';
                playerList.appendChild(substituteHeader);
            }
            const playerDiv = createPlayerDiv(player, index);
            playerList.appendChild(playerDiv);
        });
        initializeDragAndDrop();
    }

    function createPlayerDiv(player, index) {
        const playerDiv = document.createElement('div');
        playerDiv.innerHTML = `
            <span class="player-name">${player.fullName}</span>
            <span class="player-number">${player.number}</span>
        `;
        playerDiv.dataset.index = index;
        return playerDiv;
    }

    function generateSquadPreview() {
        if (!resourcesLoaded) {
            console.log('Resources not loaded yet, skipping preview generation');
            return;
        }
        console.log('Generating squad preview');

        const MARGIN = 20; // Add margin around the entire image
        const previewContainer = document.querySelector('.preview-container');
        const containerWidth = previewContainer.clientWidth;
        const containerHeight = previewContainer.clientHeight;

        const listWidth = Math.min(containerWidth * 0.2, 200);
        const fieldAspectRatio = 4 / 3; // Fixed 4:3 aspect ratio
        
        // Calculate field dimensions to fit the container
        let fieldWidth = containerWidth - listWidth - (2 * MARGIN);
        let fieldHeight = fieldWidth / fieldAspectRatio;

        // If field height is greater than container height, adjust dimensions
        if (fieldHeight > containerHeight - (2 * MARGIN)) {
            fieldHeight = containerHeight - (2 * MARGIN);
            fieldWidth = fieldHeight * fieldAspectRatio;
        }

        // Set canvas dimensions
        previewCanvas.width = listWidth + fieldWidth + (2 * MARGIN);
        previewCanvas.height = fieldHeight + (2 * MARGIN);

        // Clear the canvas
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        // Draw player list
        drawPlayerList(listWidth, MARGIN);
        
        // Draw the football field image
        const offsetX = listWidth;
        const offsetY = (previewCanvas.height - fieldHeight) / 2; // Center vertically
        
        ctx.drawImage(fieldImage, offsetX, offsetY, fieldWidth, fieldHeight);
        console.log('Field drawn at:', offsetX, offsetY, fieldWidth, fieldHeight);

        // Adjust field dimensions for player positioning
        const actualFieldWidth = fieldWidth;
        const actualFieldHeight = fieldHeight;
        const startX = offsetX;
        const startY = offsetY;

        const formation = formationSelect.value;
        const formationNumbers = formation.split('-').map(Number);
        const totalFieldPlayers = formationNumbers.reduce((a, b) => a + b, 0);

        // Assign positions based on player order and formation
        const positionedPlayers = players.slice(0, totalFieldPlayers + 1);
        if (positionedPlayers.length > 0) {
            positionedPlayers[0].position = 'goalkeeper';
        }
        let playerIndex = 1;

        if (formation === '4-2-3-1') {
            ['defender', 'defender', 'defender', 'defender', 
             'midfielder', 'midfielder', 
             'forward', 'forward', 'forward', 
             'striker'].forEach(position => {
                if (positionedPlayers[playerIndex]) {
                    positionedPlayers[playerIndex].position = position;
                    playerIndex++;
                }
            });
        } else {
            formationNumbers.forEach((count, index) => {
                const position = ['defender', 'midfielder', 'forward'][Math.min(index, 2)];
                for (let i = 0; i < count; i++) {
                    if (positionedPlayers[playerIndex]) {
                        positionedPlayers[playerIndex].position = position;
                        playerIndex++;
                    }
                }
            });
        }

        // Sort players by position
        const sortedPlayers = positionedPlayers.sort((a, b) => {
            const positionOrder = ['goalkeeper', 'defender', 'midfielder', 'forward', 'striker'];
            return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
        });

        // Create arrays for each position
        const goalkeeper = sortedPlayers.find(p => p.position === 'goalkeeper');
        const defenders = sortedPlayers.filter(p => p.position === 'defender');
        const midfielders = sortedPlayers.filter(p => p.position === 'midfielder');
        const forwards = sortedPlayers.filter(p => p.position === 'forward');
        const striker = sortedPlayers.find(p => p.position === 'striker');

        // Draw players
        const promises = sortedPlayers.map(player => {
            return new Promise((resolve) => {
                let x, y;
                if (player.position === 'goalkeeper') {
                    x = startX + actualFieldWidth / 2;
                    y = startY + actualFieldHeight * 0.10;
                } else if (player.position === 'defender') {
                    const index = defenders.indexOf(player);
                    const defenderSpacing = actualFieldWidth * 0.8;
                    const defenderStartX = startX + (actualFieldWidth - defenderSpacing) / 2;
                    x = defenderStartX + defenderSpacing * (index + 0.5) / defenders.length;
                    y = startY + actualFieldHeight * 0.30;
                } else if (player.position === 'midfielder') {
                    const index = midfielders.indexOf(player);
                    if (formation === '4-2-3-1') {
                        if (midfielders.length === 2) {
                            x = startX + actualFieldWidth * (index + 1) / 3;
                            y = startY + actualFieldHeight * 0.50;
                        } else {
                            x = startX + actualFieldWidth * (index + 1) / 4;
                            y = startY + actualFieldHeight * 0.70;
                        }
                    } else {
                        x = startX + actualFieldWidth * (index + 1) / (midfielders.length + 1);
                        y = startY + actualFieldHeight * 0.60;
                    }
                } else if (player.position === 'forward') {
                    const index = forwards.indexOf(player);
                    if (formation === '4-2-3-1') {
                        x = startX + actualFieldWidth * (index + 1) / 4;
                        y = startY + actualFieldHeight * 0.70;
                    } else {
                        x = startX + actualFieldWidth * (index + 1) / (forwards.length + 1);
                        y = startY + actualFieldHeight * 0.80;
                    }
                } else if (player.position === 'striker') {
                    x = startX + actualFieldWidth / 2;
                    y = startY + actualFieldHeight * 0.90;
                }
                drawPlayer(x, y, player, startX, actualFieldWidth);
                resolve();
            });
        });

        Promise.all(promises).then(() => {
            console.log('All players drawn');
        });
    }

    function drawPlayer(x, y, player, startX, actualFieldWidth) {
        console.log('Drawing player:', player, 'at', x, y);
        // Remove the playerSize variable and use PLAYER_SIZE instead
        
        const svgTemplate = player.position === 'goalkeeper' ? goalkeeperSvg : playerSvg;
        if (!svgTemplate) {
            console.error('SVG template not loaded for', player.position);
            return;
        }
        console.log('SVG template:', svgTemplate.substring(0, 100) + '...');

        const svgElement = new DOMParser().parseFromString(svgTemplate, 'image/svg+xml').documentElement;

        // Customize SVG colors with fixed values
        svgElement.querySelectorAll('.primary').forEach(el => el.style.fill = '#ff0000');
        svgElement.querySelectorAll('.secondary').forEach(el => el.style.fill = '#ffffff');

        // Add player number to the SVG
        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement.setAttribute('x', '50%');
        textElement.setAttribute('y', '50%');
        textElement.setAttribute('dominant-baseline', 'middle');
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('font-size', '36');
        textElement.setAttribute('font-weight', 'bold');
        textElement.setAttribute('fill', '#ffffff');
        textElement.textContent = player.number;
        svgElement.appendChild(textElement);

        const svgString = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        img.onload = () => {
            console.log('Player image loaded:', player.name);
            ctx.save();
            ctx.translate(x - PLAYER_SIZE / 2, y - PLAYER_SIZE / 2);
            // Calculate scale to fit the player size
            const scale = PLAYER_SIZE / Math.max(img.width, img.height);
            ctx.scale(scale, scale);
            
            ctx.drawImage(img, 0, 0);
            ctx.restore();

            // Draw player name below the jersey
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(player.shortName, x, y + PLAYER_SIZE / 2 + 5);
        };
        img.onerror = (error) => {
            console.error('Error loading player image:', error);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
    }

    function drawPlayerList(listWidth, margin) {
        const listHeight = previewCanvas.height - (2 * margin);
        
        // Draw list background
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(margin, margin, listWidth - margin, listHeight);
        
        // Draw border
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(margin, margin, listWidth - margin, listHeight);

        // Draw player names
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const startingLineupCount = 11;
        let yOffset = margin + 10;
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Starting Eleven', margin + 10, yOffset);
        yOffset += 30;
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        players.forEach((player, index) => {
            if (index === startingLineupCount) {
                // Draw a horizontal line
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(margin + 5, yOffset);
                ctx.lineTo(listWidth - margin - 5, yOffset);
                ctx.stroke();
                yOffset += 20;

                ctx.fillStyle = '#333333';
                ctx.font = 'bold 18px Arial';
                ctx.fillText('Substitutes', margin + 10, yOffset);
                yOffset += 25; // Add extra space after the header
                ctx.fillStyle = '#000000';
                ctx.font = '14px Arial';
            }
            const playerText = `${player.number}. ${player.fullName}`;
            ctx.fillText(playerText, margin + 10, yOffset);
            yOffset += 20;
        });
    }

    function addPlaceholderPlayers() {
        console.log('Adding specific players');
        const actualPlayers = [
            { shortName: 'P.Židov', fullName: 'Petar Židov', number: '1' },
            { shortName: 'Petković', fullName: 'Dominik Petković', number: '11' },
            { shortName: 'Kočiš', fullName: 'Dejan Kočiš', number: '5' },
            { shortName: 'Šimunković', fullName: 'Ivan Šimunković', number: '4' },
            { shortName: 'Mihoci', fullName: 'David Mihoci', number: '8' },
            { shortName: 'I.Židov', fullName: 'Ivan Židov', number: '6' },
            { shortName: 'Hozjak', fullName: 'Fran Hozjak', number: '15' },
            { shortName: 'Reiff', fullName: 'Filip Reiff', number: '10' },
            { shortName: 'Tkalec', fullName: 'Patrik Tkalec', number: '18' },
            { shortName: 'Blažinčić', fullName: 'Nikola Blažinčić', number: '7' },
            { shortName: 'Igrec', fullName: 'Josip Igrec', number: '20' },
            { shortName: 'Sub 1', fullName: 'Substitute 1', number: '12' },
            { shortName: 'Sub 2', fullName: 'Substitute 2', number: '13' },
            { shortName: 'Sub 3', fullName: 'Substitute 3', number: '16' },
            { shortName: 'Sub 4', fullName: 'Substitute 4', number: '17' },
            { shortName: 'Sub 5', fullName: 'Substitute 5', number: '19' },
            { shortName: 'Sub 6', fullName: 'Substitute 6', number: '20' },
            { shortName: 'Sub 7', fullName: 'Substitute 7', number: '21' }
        ];

        players = actualPlayers;
        updatePlayerList();
        generateSquadPreview();
    }

    // Load SVG templates and field image
    console.log('Starting to load resources');
    Promise.all([
        fetch('./img/players.svg').then(response => {
            if (!response.ok) throw new Error('Failed to load players.svg');
            return response.text();
        }),
        fetch('./img/goalkeeper.svg').then(response => {
            if (!response.ok) throw new Error('Failed to load goalkeeper.svg');
            return response.text();
        }),
        new Promise((resolve, reject) => {
            fieldImage = new Image();
            fieldImage.onload = () => {
                console.log('Field image loaded successfully');
                resolve();
            };
            fieldImage.onerror = (error) => {
                console.error('Error loading field image:', error);
                reject(new Error('Failed to load field image'));
            };
            fieldImage.src = './img/football_field.png';
        })
    ]).then(([playerSvgText, goalkeeperSvgText]) => {
        console.log('All resources loaded');
        playerSvg = playerSvgText;
        goalkeeperSvg = goalkeeperSvgText;
        resourcesLoaded = true;
        initializeApp();
    }).catch(error => {
        console.error('Error loading resources:', error);
    });

    formationSelect.addEventListener('change', (event) => {
        console.log('Selected formation:', event.target.value);
        generateSquadPreview(); // Update preview when formation changes
    });

    // Set initial formation
    formationSelect.value = '4-2-3-1';

    // Add a small delay before initial preview generation
    setTimeout(() => {
        if (resourcesLoaded && players.length > 0) {
            generateSquadPreview();
        }
    }, 100);

    downloadImageButton.addEventListener('click', () => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const aspectRatio = 4 / 3;
        const width = 1200; // Fixed width for the downloaded image
        const height = width / aspectRatio;

        tempCanvas.width = width;
        tempCanvas.height = height;

        // Draw the existing canvas content onto the temp canvas
        tempCtx.drawImage(previewCanvas, 0, 0, previewCanvas.width, previewCanvas.height, 0, 0, width, height);

        const link = document.createElement('a');
        link.download = 'squad_preview.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    });
});