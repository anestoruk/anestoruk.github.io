import Square from './Square.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-area');
        this.ctx = this.canvas.getContext('2d');
        this.startButton = document.getElementById('start-button');
        this.timeDisplay = document.getElementById('time');
        this.scoreDisplay = document.getElementById('score');
        this.levelDisplay = document.getElementById('level');
        
        // Initialize game state
        this.startButton.style.display = 'block';
        this.startButton.textContent = 'Start Game';
        this.startButton.disabled = false;
        this.hitDangerousSquare = false;
        
        // Setup canvas and window events
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Game state properties
        this.animationTime = 0;
        this.squares = [];
        this.particles = [];
        this.scorePopups = [];
        this.score = 0;
        this.timeLeft = 30;
        this.gameInterval = null;
        this.isPlaying = false;
        this.currentLevel = 1;
        this.squaresPerLevel = 4;
        this.squareSize = 30;
        this.rotationSpeed = 2;
        this.trailFadeRate = 0.01;
        this.rainbowSpawnChance = 0.02;
        this.yellowSpawnChance = 0.1;
        this.purifierSpawnChance = 0.05;
        this.rainbowHue = 0;
        
        // Visual effect properties
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        this.shakeOffset = { x: 0, y: 0 };
        this.lastShakeTime = 0;
        this.shakeSeed = Math.random() * 1000;
        this.isShaking = false;
        this.flashIntensity = 0;
        this.flashDecay = 0.95;
        
        // Selection properties
        this.isSelecting = false;
        this.selectionStart = { x: 0, y: 0 };
        this.selectionEnd = { x: 0, y: 0 };
        
        // Audio properties
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.popSoundBuffer = null;
        this.loadSounds();
        this.isMuted = false;
        this.activePopSounds = 0;
        this.maxPopSounds = 5;

        // Background properties
        this.stars = [];
        this.initStars();
        this.shootingStars = [];
        this.lastShootingStar = 0;
        this.shootingStarInterval = 10_000;
        this.nebulaHue = Math.random() * 360;
        this.fireParticleCount = 20;
        this.frostParticleCount = 8;
        
        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fpsUpdateInterval = 1000;
        
        // Event listeners
        this.startButton.addEventListener('click', () => this.startGame());
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Initialize animation
        this.lastTime = 0;
        this.animate = this.animate.bind(this);

        // Show initial rules screen
        this.showRules();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Reinitialize stars for new canvas size
        this.stars = [];
        this.initStars();
    }
    
    initStars() {
        // Create stars with random properties
        this.stars = [];
        this.shootingStarInterval = Math.max(10_000 - (this.currentLevel * 500), 500);
        const starCount = 10 + (this.currentLevel * 10);
        
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2,
                baseBrightness: Math.random() * 0.5 + 0.5,
                pulseSpeed: Math.random() * 0.2 + 0.2,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }
    
    animate(currentTime) {
        if (!this.isPlaying) return;
        
        // Update performance metrics
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            this.updateFPS();
        }
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update visual effects
        this.rainbowHue = (this.rainbowHue + 20 * (deltaTime / 16.67)) % 360;
        
        if (this.shakeIntensity > 0.1) {
            this.shakeIntensity *= Math.pow(this.shakeDecay, deltaTime / 16.67);
            this.isShaking = true;
            
            const time = currentTime * 0.01;
            this.shakeOffset.x = Math.sin(time * 10 + this.shakeSeed) * this.shakeIntensity;
            this.shakeOffset.y = Math.cos(time * 8 + this.shakeSeed) * this.shakeIntensity;
            
            if (this.shakeIntensity < 0.1) {
                this.shakeIntensity = 0;
                this.shakeOffset = { x: 0, y: 0 };
                this.isShaking = false;
            }
        }
        
        if (this.flashIntensity > 0) {
            this.flashIntensity *= Math.pow(this.flashDecay, deltaTime / 16.67);
            if (this.flashIntensity < 0.01) {
                this.flashIntensity = 0;
            }
        }
        
        this.animationTime += deltaTime / 1000;
        
        // Clear and draw frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        
        // Update and draw game objects
        this.squares.forEach(square => {
            this.updateSquare(square, deltaTime);
            this.drawSquare(square);
        });
        
        this.particles = this.particles.filter(particle => {
            this.updateParticle(particle, deltaTime);
            this.drawParticle(particle);
            return particle.life > 0;
        });
        
        this.scorePopups = this.scorePopups.filter(popup => {
            this.updateScorePopup(popup, deltaTime);
            this.drawScorePopup(popup);
            return popup.life > 0;
        });
        
        // Draw UI elements
        this.drawSelectionBox();
        
        if (this.flashIntensity > 0) {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
        
        requestAnimationFrame(this.animate);
    }
    
    drawBackground() {
        // Draw gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(1, '#1a1a2a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawNebula();
        this.updateShootingStars();
        
        // Draw stars with pulsing effect
        for (const star of this.stars) {
            const pulse = Math.sin(this.animationTime * star.pulseSpeed + star.pulseOffset) * 0.8 + 0.2;
            const brightness = star.baseBrightness * pulse;
            const isColored = Math.random() < 0.3;
            const starHue = isColored ? (this.animationTime * 20 + star.pulseOffset * 50) % 360 : 0;
            
            const gradient = this.ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 3
            );
            
            if (isColored) {
                gradient.addColorStop(0, `hsla(${starHue}, 100%, 80%, ${brightness})`);
                gradient.addColorStop(0.4, `hsla(${starHue}, 100%, 50%, ${brightness * 0.4})`);
                gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            } else {
                gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
                gradient.addColorStop(0.4, `rgba(255, 255, 255, ${brightness * 0.4})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = isColored ? 
                `hsla(${starHue}, 100%, 80%, ${brightness})` : 
                `rgba(255, 255, 255, ${brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawNebula() {
        // Create nebula gradient
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width * 0.5, this.canvas.height * 0.5, 0,
            this.canvas.width * 0.5, this.canvas.height * 0.5, this.canvas.width * 0.8
        );
        
        // Update nebula hue
        this.nebulaHue = (this.nebulaHue + 0.1) % 360;
        
        // Add color stops with varying opacity
        gradient.addColorStop(0, `hsla(${this.nebulaHue}, 100%, 50%, 0.15)`);
        gradient.addColorStop(0.3, `hsla(${(this.nebulaHue + 60) % 360}, 100%, 50%, 0.05)`);
        gradient.addColorStop(0.6, `hsla(${(this.nebulaHue + 120) % 360}, 100%, 50%, 0.02)`);
        gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        
        // Draw nebula
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateShootingStars() {
        const currentTime = performance.now();
        
        // Add new shooting star
        if (currentTime - this.lastShootingStar > this.shootingStarInterval) {
            this.lastShootingStar = currentTime;
            
            // Random starting position from top of screen
            const startX = Math.random() * this.canvas.width;
            const startY = 0;
            
            // Random angle (mostly downward)
            const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
            
            // Random speed
            const speed = 15 + Math.random() * 10;
            
            this.shootingStars.push({
                x: startX,
                y: startY,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                length: 50 + Math.random() * 50,
                life: 1,
                hue: Math.random() * 360
            });
        }
        
        // Update and draw existing shooting stars
        this.shootingStars = this.shootingStars.filter(star => {
            // Update position
            star.x += star.dx;
            star.y += star.dy;
            star.life -= 0.02;
            
            if (star.life <= 0) return false;
            
            // Draw shooting star
            this.ctx.save();
            
            // Create gradient for the trail
            const gradient = this.ctx.createLinearGradient(
                star.x, star.y,
                star.x - star.dx * star.length, star.y - star.dy * star.length
            );
            
            gradient.addColorStop(0, `hsla(${star.hue}, 100%, 80%, ${star.life})`);
            gradient.addColorStop(1, `hsla(${star.hue}, 100%, 80%, 0)`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(
                star.x - star.dx * star.length,
                star.y - star.dy * star.length
            );
            this.ctx.stroke();
            
            this.ctx.restore();
            
            return true;
        });
    }
    
    drawSquare(square) {
        square.draw(this.ctx, this.rainbowHue, this.shakeOffset.x, this.shakeOffset.y);
    }
    
    updateSquare(square, deltaTime) {
        square.update(deltaTime, this.canvas.width, this.canvas.height, this.animationTime);

        // Check collisions with other squares
        const collisionRadius = this.squareSize * 2;
        for (const otherSquare of this.squares) {
            if (otherSquare === square || otherSquare.isClicked) continue;
            square.checkCollision(otherSquare);
        }
    }
    
    createParticles(x, y, color) {
        const particleCount = 16;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 5 + Math.random() * 2;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            
            this.particles.push({
                x: x + this.squareSize/2,
                y: y + this.squareSize/2,
                dx: dx,
                dy: dy,
                size: 5 + Math.random() * 3,
                color: color,
                life: 1,
                maxLife: 1,
                // Add friction to slow down particles
                friction: 0.95
            });
        }
    }
    
    updateParticle(particle, deltaTime) {
        // Apply friction to slow down particles
        particle.dx *= Math.pow(particle.friction, deltaTime / 16.67);
        particle.dy *= Math.pow(particle.friction, deltaTime / 16.67);
        
        // Update position with deltaTime
        particle.x += particle.dx * (deltaTime / 16.67);
        particle.y += particle.dy * (deltaTime / 16.67);
        
        // Update life
        particle.life -= deltaTime / 1000;
        
        // Ensure life doesn't go below 0
        particle.life = Math.max(0, particle.life);
    }
    
    drawParticle(particle) {
        // Apply shake offset to particle position if shaking
        const shakeX = this.isShaking ? this.shakeOffset.x : 0;
        const shakeY = this.isShaking ? this.shakeOffset.y : 0;

        // Calculate alpha with smooth fade out
        const alpha = Math.pow(particle.life / particle.maxLife, 2);
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Create gradient for particle glow
        const gradient = this.ctx.createRadialGradient(
            particle.x + shakeX, particle.y + shakeY, 0,
            particle.x + shakeX, particle.y + shakeY, particle.size
        );
        
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(particle.x + shakeX, particle.y + shakeY, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    handleMouseDown(e) {
        if (!this.isPlaying) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (x >= 0 && x <= this.canvas.width && y >= 0 && y <= this.canvas.height) {
            // Check for square clicks
            for (const square of this.squares) {
                if (square.isClicked) continue;
                
                const hitboxMargin = 10;
                if (x >= square.x - hitboxMargin && x <= square.x + this.squareSize + hitboxMargin &&
                    y >= square.y - hitboxMargin && y <= square.y + this.squareSize + hitboxMargin) {
                    this.clickSquare(square);
                    return;
                }
            }
            
            // Start box selection if no square was clicked
            this.isSelecting = true;
            this.selectionStart = { x, y };
            this.selectionEnd = { x, y };
        }
    }

    handleMouseMove(e) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.selectionEnd = {
            x: Math.max(0, Math.min(x, this.canvas.width)),
            y: Math.max(0, Math.min(y, this.canvas.height))
        };
    }

    handleMouseUp(e) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.selectionEnd = {
            x: Math.max(0, Math.min(x, this.canvas.width)),
            y: Math.max(0, Math.min(y, this.canvas.height))
        };
        
        if (this.selectionStart.x !== this.selectionEnd.x || 
            this.selectionStart.y !== this.selectionEnd.y) {
            this.finalizeSelection();
        }
        
        this.cancelSelection();
    }

    cancelSelection() {
        if (this.isSelecting) {
            this.isSelecting = false;
        }
    }

    finalizeSelection() {
        if (!this.isSelecting) return;
        
        const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const right = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const bottom = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        // Find squares within selection bounds
        const squaresToPop = this.squares.filter(square => {
            const squareLeft = square.x;
            const squareTop = square.y;
            const squareRight = square.x + this.squareSize;
            const squareBottom = square.y + this.squareSize;
            
            return squareLeft >= left && squareRight <= right &&
                   squareTop >= top && squareBottom <= bottom;
        });
        
        // Check for dangerous squares
        const hasDangerousSquare = squaresToPop.some(square => square.isDangerous);
        
        if (hasDangerousSquare) {
            this.hitDangerousSquare = true;
            this.endGame();
            this.cancelSelection();
            return;
        }
        
        // Calculate and display score
        if (squaresToPop.length > 0) {
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            
            if (squaresToPop.length > 1) {
                // Calculate score based on square types
                const greenCount = squaresToPop.filter(s => !s.isRainbow && !s.isYellow && !s.isPurifier).length;
                const yellowCount = squaresToPop.filter(s => s.isYellow).length;
                const rainbowCount = squaresToPop.filter(s => s.isRainbow).length;
                const purifierCount = squaresToPop.filter(s => s.isPurifier).length;
                
                const baseScore = (greenCount * 10) + (yellowCount * 25) + (rainbowCount * 100);
                const multiplier = squaresToPop.length;
                const bonusScore = baseScore * multiplier;
                
                // Display score calculation
                let calculationStr = '(';
                const parts = [];
                if (greenCount > 0) parts.push(`${greenCount}x10`);
                if (yellowCount > 0) parts.push(`${yellowCount}x25`);
                if (rainbowCount > 0) parts.push(`${rainbowCount}x100`);
                if (purifierCount > 0) parts.push(`${purifierCount}x0`);
                calculationStr += parts.join(' + ') + ')';
                calculationStr += ` x ${multiplier}`;
                
                this.score += bonusScore;
                this.updateScore();
                
                this.createScorePopup(centerX - this.squareSize/2, centerY - this.squareSize/2 - 20, calculationStr);
                this.createScorePopup(centerX - this.squareSize/2, centerY - this.squareSize/2 + 20, `+${bonusScore}`);
                
                this.triggerScreenShake(Math.min(bonusScore / 100, 40));
            } else {
                // Single square score
                let points = 0;
                if (squaresToPop[0].isRainbow) points = 100;
                else if (squaresToPop[0].isYellow) points = 25;
                else if (!squaresToPop[0].isPurifier) points = 10;
                
                if (points > 0) {
                    this.score += points;
                    this.updateScore();
                    this.createScorePopup(centerX - this.squareSize/2, centerY - this.squareSize/2, `+${points}`);
                } else if (squaresToPop[0].isPurifier) {
                    this.createScorePopup(centerX - this.squareSize/2, centerY - this.squareSize/2, 'Purified!', '#87CEEB');
                }
            }
        }
        
        // Handle purifier effects
        const purifierSquares = squaresToPop.filter(square => square.isPurifier);
        if (purifierSquares.length > 0) {
            const dangerousSquares = this.squares.filter(s => s.isDangerous && !s.isClicked);
            
            if (dangerousSquares.length > 0) {
                const numToConvert = Math.min(purifierSquares.length, dangerousSquares.length);
                
                // Randomize which squares get converted
                for (let i = dangerousSquares.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [dangerousSquares[i], dangerousSquares[j]] = [dangerousSquares[j], dangerousSquares[i]];
                }
                
                // Convert selected squares
                for (let i = 0; i < numToConvert; i++) {
                    const squareToConvert = dangerousSquares[i];
                    squareToConvert.isDangerous = false;
                    this.createParticles(squareToConvert.x, squareToConvert.y, '#87CEEB');
                    this.createScorePopup(squareToConvert.x, squareToConvert.y, 'Purified!', '#87CEEB');
                }
            } else {
                this.createScorePopup(purifierSquares[0].x, purifierSquares[0].y, 'No red squares to purify!', '#87CEEB');
            }
        }
        
        // Remove selected squares
        squaresToPop.forEach(square => {
            if (!square.isClicked) {
                this.clickSquare(square, false, true);
            }
        });
        
        this.cancelSelection();
    }

    drawSelectionBox() {
        if (!this.isSelecting) return;
        
        const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        // Check if selection contains any dangerous squares
        const hasDangerousSquare = this.squares.some(square => {
            if (square.isClicked) return false;
            const squareLeft = square.x;
            const squareTop = square.y;
            const squareRight = square.x + this.squareSize;
            const squareBottom = square.y + this.squareSize;
            
            return square.isDangerous && 
                   squareLeft >= left && squareRight <= left + width &&
                   squareTop >= top && squareBottom <= top + height;
        });
        
        // Draw selection box
        this.ctx.save();
        this.ctx.strokeStyle = hasDangerousSquare ? '#FF0000' : '#00ff00';
        this.ctx.lineWidth = 2;
        // this.ctx.setLineDash([1, 1]);
        this.ctx.strokeRect(left, top, width, height);
        
        // Draw semi-transparent fill
        this.ctx.fillStyle = hasDangerousSquare ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(left, top, width, height);
        this.ctx.restore();
    }
    
    clickSquare(square, updateScore = true, skipPurifier = false) {
        if (!this.isPlaying || square.isClicked) return;
        
        square.isClicked = true;
        
        if (square.isDangerous) {
            this.hitDangerousSquare = true;
            this.endGame();
            return;
        }
        
        if (updateScore) {
            let points = 0;
            if (square.isRainbow) {
                points = 100;
            } else if (square.isYellow) {
                points = 25;
            } else if (!square.isPurifier) { // Purifier gives 0 points
                points = 10;
            }
            
            if (points > 0) {
                this.score += points;
                this.updateScore();
                this.createScorePopup(square.x, square.y, `+${points}`);
            }
        }
        
        // Handle purifier effect only if not skipped
        if (square.isPurifier && !skipPurifier) {
            // Get all dangerous squares
            const dangerousSquares = this.squares.filter(s => s.isDangerous && !s.isClicked);
            
            if (dangerousSquares.length > 0) {
                // Select one random dangerous square to convert
                const randomIndex = Math.floor(Math.random() * dangerousSquares.length);
                const squareToConvert = dangerousSquares[randomIndex];
                
                // Convert the selected square
                squareToConvert.isDangerous = false;
                // Add a visual effect for the conversion
                this.createParticles(squareToConvert.x, squareToConvert.y, '#87CEEB');
                // Show purifier effect message
                this.createScorePopup(squareToConvert.x, squareToConvert.y, 'Purified!', '#87CEEB');
            } else {
                // Show message if no dangerous squares to convert
                this.createScorePopup(square.x, square.y, 'No red squares to purify!', '#87CEEB');
            }
        }
        
        this.playPopSound();
        this.createParticles(square.x, square.y, 
            square.isRainbow ? `hsl(${this.rainbowHue}, 100%, 50%)` : 
            square.isYellow ? '#FFD700' : 
            square.isPurifier ? '#87CEEB' : '#00FF00');
        
        // Remove square
        const index = this.squares.indexOf(square);
        if (index > -1) {
            this.squares.splice(index, 1);
        }
        
        // Check if level is complete
        const remainingNonDangerous = this.squares.filter(s => !s.isDangerous);
        if (remainingNonDangerous.length === 0) {
            this.nextLevel();
        }
    }
    
    spawnSquare(forceDangerous = false) {
        const isRainbow = !forceDangerous && Math.random() < this.rainbowSpawnChance;
        const isYellow = !forceDangerous && !isRainbow && Math.random() < this.yellowSpawnChance;
        const isPurifier = !forceDangerous && !isRainbow && !isYellow && Math.random() < this.purifierSpawnChance;
        const x = Math.random() * (this.canvas.width - this.squareSize);
        const y = Math.random() * (this.canvas.height - this.squareSize);
        const speed = isRainbow 
            ? 1 + Math.random() * 5 
            : isYellow
                ? 0.8 + Math.random() * 2
                : isPurifier
                    ? 0.3 + Math.random() * 0.5
                    : 0.5 + Math.random();

        const angle = Math.random() * Math.PI * 2;

        const trailLength = isRainbow ? 20 : 0;
        
        this.squares.push(new Square(
            x, y, speed, angle, isRainbow, isYellow, isPurifier, forceDangerous,
            this.squareSize, trailLength, this.trailFadeRate,
            this.fireParticleCount, this.frostParticleCount
        ));
    }
    
    async loadSounds() {
        try {
            // Load pop sound
            console.log('Loading pop sound...');
            const popResponse = await fetch('assets/audio/pop.wav');
            if (!popResponse.ok) throw new Error(`HTTP error! status: ${popResponse.status}`);
            const popArrayBuffer = await popResponse.arrayBuffer();
            this.popSoundBuffer = await this.audioContext.decodeAudioData(popArrayBuffer);
            console.log('Pop sound loaded successfully!');
        } catch (error) {
            console.error('Error loading sounds:', error);
        }
    }

    playPopSound() {
        if (this.activePopSounds >= this.maxPopSounds) return;
        
        if (this.popSoundBuffer) {
            console.log('Playing recorded pop sound');
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = this.popSoundBuffer;
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Set volume
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            
            // Increment counter when sound starts
            this.activePopSounds++;
            
            // Decrement counter when sound ends
            source.onended = () => {
                this.activePopSounds--;
            };
            
            source.start();
        } else if (this.popSound) {
            console.log('Playing synthesized pop sound');
            // Fallback to synthesized sound
            this.popSound();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.muteButton.textContent = this.isMuted ? '🔇' : '🔊';
        this.muteButton.classList.toggle('muted', this.isMuted);
    }

    startGame() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.score = 0;
        this.timeLeft = 30;
        this.currentLevel = 1;
        this.squares = [];
        this.updateScore();
        this.updateTimer();
        this.updateLevel();

        this.initStars();
        
        // Hide the start button
        this.startButton.style.display = 'none';
        
        this.gameInterval = setInterval(() => this.updateTimer(), 1000);
        this.spawnLevelSquares();
        
        // Start animation loop
        this.lastTime = performance.now();
        requestAnimationFrame(this.animate);
    }

    spawnLevelSquares() {
        const squaresToSpawn = this.squaresPerLevel + this.currentLevel;
        const dangerousSquares = 1+ Math.round(this.currentLevel / 3); // Number of dangerous squares equals current level
        // const dangerousSquares = 0; // Number of dangerous squares equals current level
        
        // First spawn dangerous squares
        for (let i = 0; i < dangerousSquares; i++) {
            this.spawnSquare(true);
        }
        
        // Then spawn regular squares
        for (let i = 0; i < squaresToSpawn; i++) {
            this.spawnSquare(false);
        }
    }

    nextLevel() {
        this.currentLevel++;
        this.timeLeft = 30;
        this.updateTimer();
        this.updateLevel();
        
        // Show level announcement
        const announcement = document.createElement('div');
        announcement.className = 'level-announcement';
        announcement.textContent = `Level ${this.currentLevel}`;
        document.body.appendChild(announcement);
        
        // Remove the announcement element after animation
        announcement.addEventListener('animationend', () => {
            announcement.remove();
        });
        
        // Clear existing squares
        this.squares = [];
        
        this.spawnLevelSquares();

        this.initStars();
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
    }

    updateTimer() {
        this.timeLeft--;
        this.timeDisplay.textContent = this.timeLeft;
        
        if (this.timeLeft <= 0) {
            this.endGame();
        }
    }

    updateLevel() {
        this.levelDisplay.textContent = this.currentLevel;
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.gameInterval);
        
        // Clear squares
        this.squares = [];
        
        // Create game over overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        
        // Create title
        const title = document.createElement('div');
        title.className = 'game-over-title';
        title.textContent = this.hitDangerousSquare ? 'Game over! You hit a red square!' : 'Game over! Time\'s up!';
        overlay.appendChild(title);
        
        // Create stats
        const stats = document.createElement('div');
        stats.className = 'game-over-stats';
        stats.innerHTML = `
            Score: ${this.score}<br>
            Level: ${this.currentLevel}
        `;
        overlay.appendChild(stats);
        
        // Create play again button
        const playAgainButton = document.createElement('button');
        playAgainButton.className = 'play-again-button';
        playAgainButton.textContent = 'Play Again';
        playAgainButton.addEventListener('click', () => {
            overlay.remove();
            this.hitDangerousSquare = false; // Reset the flag
            this.startGame();
        });
        overlay.appendChild(playAgainButton);
        
        // Add overlay to document
        document.body.appendChild(overlay);
        
        // Hide the start button
        this.startButton.style.display = 'none';
    }

    createScorePopup(x, y, text = '+10') {
        // Extract the numeric value from the text (remove the '+' sign)
        const scoreValue = parseInt(text.replace('+', ''));
        
        // Calculate font size based on score value
        // Base size is 30px, scales up for larger numbers
        // For example: 10 -> 30px, 100 -> 40px, 1000 -> 50px
        const fontSize = Math.min(20 + Math.log2(scoreValue) * 4, 100);
        
        // Trigger flash effect
        // Scale flash intensity with score value
        this.flashIntensity = Math.log2(scoreValue) * 0.001;

        this.scorePopups.push({
            x: x + this.squareSize/2,
            y: y + this.squareSize/2,
            text: text,
            life: 2,
            maxLife: 2,
            fontSize: fontSize,
            dy: -1 // Move upward
        });
    }

    updateScorePopup(popup, deltaTime) {
        // Update position with deltaTime
        popup.y += popup.dy * (deltaTime / 16.67);
        // Update life
        popup.life -= deltaTime / 1000;
        return popup.life > 0;
    }

    drawScorePopup(popup) {
        // Apply shake offset to popup position if shaking
        const shakeX = this.isShaking ? this.shakeOffset.x : 0;
        const shakeY = this.isShaking ? this.shakeOffset.y : 0;

        const alpha = Math.pow(popup.life / popup.maxLife, 2);
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        const isCalculation = popup.text.includes('x');
        const fontSize = isCalculation ? 15 : popup.fontSize;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(popup.text, popup.x + shakeX, popup.y + shakeY);
        
        this.ctx.restore();
    }

    triggerScreenShake(intensity = 20) {
        // Only trigger new shake if current shake is weak or non-existent
        if (this.shakeIntensity < intensity * 0.5) {
            this.shakeIntensity = intensity;
            this.shakeSeed = Math.random() * 1000;
        }
    }

    showRules() {
        // Create rules overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.style.overflowY = 'auto'; // Make overlay scrollable
        overlay.style.maxHeight = '90vh'; // Limit height to 90% of viewport height
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        
        // Create title
        const title = document.createElement('div');
        title.className = 'game-over-title';
        title.textContent = 'How to Play';
        overlay.appendChild(title);
        
        // Create rules content
        const rules = document.createElement('div');
        rules.className = 'game-over-stats';
        rules.style.flex = '1'; // Allow rules to take remaining space
        rules.innerHTML = `
            <div style="text-align: left; margin: 20px;">
                <h3>Objective:</h3>
                <p>Collect squares to score points and advance through levels!</p>
                
                <h3>Square Types:</h3>
                <ul style="list-style-type: none; padding-left: 0;">
                    <li>🟩 Green: 10 points</li>
                    <li>🟥 Red: Game over if collected!</li>
                    <li>🟨 Yellow: 25 points</li>
                    <li>🟦 Light Blue: Converts red squares to green</li>
                    <li>🌈 Rainbow: 100 points</li>
                </ul>
                
                <h3>Controls:</h3>
                <ul style="list-style-type: none; padding-left: 0;">
                    <li>Click: Collect individual squares</li>
                    <li>Drag: Select multiple squares</li>
                    <li>Multiplier: More squares = higher score!</li>
                </ul>
                
                <h3>Tips:</h3>
                <ul style="list-style-type: none; padding-left: 0;">
                    <li>- Use light blue squares to convert red ones</li>
                    <li>- Collect multiple squares for bonus points</li>
                    <li>- Watch out for red squares!</li>
                </ul>
            </div>
        `;
        overlay.appendChild(rules);
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.padding = '20px';
        buttonContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        buttonContainer.style.position = 'sticky';
        buttonContainer.style.bottom = '0';
        buttonContainer.style.width = '100%';
        buttonContainer.style.boxSizing = 'border-box';
        
        // Create start button
        const startButton = document.createElement('button');
        startButton.className = 'play-again-button';
        startButton.textContent = 'Start Game';
        startButton.style.width = '100%';
        startButton.style.maxWidth = '300px';
        startButton.style.margin = '0 auto';
        startButton.style.display = 'block';
        startButton.addEventListener('click', () => {
            overlay.remove();
            this.startGame();
        });
        
        buttonContainer.appendChild(startButton);
        overlay.appendChild(buttonContainer);
        
        // Add overlay to document
        document.body.appendChild(overlay);
        
        // Hide the original start button
        this.startButton.style.display = 'none';
    }

    updateFPS() {
        // Create or update FPS display
        let fpsDisplay = document.getElementById('fps-display');
        if (!fpsDisplay) {
            fpsDisplay = document.createElement('div');
            fpsDisplay.id = 'fps-display';
            fpsDisplay.style.position = 'fixed';
            fpsDisplay.style.top = '20px';
            fpsDisplay.style.left = '20px';
            fpsDisplay.style.color = '#fff';
            fpsDisplay.style.fontSize = '16px';
            fpsDisplay.style.zIndex = '1000';
            fpsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            fpsDisplay.style.padding = '5px 10px';
            fpsDisplay.style.borderRadius = '5px';
            document.body.appendChild(fpsDisplay);
        }
        fpsDisplay.textContent = `FPS: ${this.fps}`;
    }
}

// Initialize the game
const game = new Game(); 