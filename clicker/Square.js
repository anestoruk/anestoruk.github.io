class Square {

    constructor(x, y, speed, angle, isRainbow, isYellow, isPurifier, isDangerous, squareSize, trailLength, trailFadeRate, fireParticleCount, frostParticleCount) {
        this.x = x;
        this.y = y;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() * 10 - 4);
        this.isClicked = false;
        this.isDangerous = isDangerous;
        this.isRainbow = isRainbow;
        this.isYellow = isYellow;
        this.isPurifier = isPurifier;
        this.fadeIn = 0;
        this.squareSize = squareSize;
        this.trailLength = trailLength;
        this.trailFadeRate = trailFadeRate;
        this.fireParticleCount = fireParticleCount;
        this.frostParticleCount = frostParticleCount;

        // Initialize trail
        if (trailLength > 0) {
            this.trail = new Array(trailLength);
            for (let i = 0; i < trailLength; i++) {
                this.trail[i] = {
                    x: x,
                    y: y,
                    rotation: 0,
                    alpha: 1 - (i * trailFadeRate)
                };
            }
        }
        this.trailIndex = 0;

        // Initialize fire particles for yellow squares
        if (isYellow) {
            this.fireParticles = new Array(fireParticleCount);
            for (let i = 0; i < fireParticleCount; i++) {
                const particleAngle = Math.random() * Math.PI * 2;
                const particleSpeed = 0.5 + Math.random() * 1;
                const size = 5 + Math.random() * 3;
                
                this.fireParticles[i] = {
                    x: x + squareSize/2,
                    y: y + squareSize/2,
                    dx: Math.cos(particleAngle) * particleSpeed,
                    dy: Math.sin(particleAngle) * particleSpeed - 1,
                    size: size,
                    life: 0,
                    maxLife: 0.5 + Math.random() * 0.5,
                    hue: 30 + Math.random() * 30,
                    active: false
                };
            }
            this.fireParticleIndex = 0;
        }

        // Initialize frost particles for purifier squares
        if (isPurifier) {
            this.frostParticles = new Array(frostParticleCount);
            for (let i = 0; i < frostParticleCount; i++) {
                const angle = (i / frostParticleCount) * Math.PI * 2;
                const radius = squareSize * 1.2;
                const particleX = x + squareSize/2 + Math.cos(angle) * radius;
                const particleY = y + squareSize/2 + Math.sin(angle) * radius;
                
                this.frostParticles[i] = {
                    x: particleX,
                    y: particleY,
                    angle: angle,
                    radius: radius,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.1,
                    size: 3 + Math.random() * 2,
                    pulseOffset: Math.random() * Math.PI * 2,
                    active: true
                };
            }
        }
    }

    update(deltaTime, canvasWidth, canvasHeight, animationTime) {
        if (this.isClicked) return;

        // Update fade-in
        if (this.fadeIn < 1) {
            this.fadeIn = Math.min(1, this.fadeIn + deltaTime / 500);
        }

        // Update trail
        if (this.trail) {
            const currentTrail = this.trail[this.trailIndex];
            currentTrail.x = this.x;
            currentTrail.y = this.y;
            currentTrail.rotation = this.rotation;
            currentTrail.alpha = 1.0;

            this.trailIndex = (this.trailIndex + 1) % this.trailLength;

            // Update trail alpha values
            for (let i = 0; i < this.trailLength; i++) {
                const index = (this.trailIndex + i) % this.trailLength;
                this.trail[index].alpha = 1 - (i * this.trailFadeRate);
            }
        }

        // Update frost particles
        if (this.isPurifier && this.frostParticles) {
            for (let i = 0; i < this.frostParticleCount; i++) {
                const particle = this.frostParticles[i];
                if (particle.active) {
                    particle.angle += 0.01 * (deltaTime / 16.67);
                    particle.rotation += particle.rotationSpeed * (deltaTime / 16.67);
                    
                    const radius = particle.radius * (0.9 + Math.sin(animationTime * 2 + particle.pulseOffset) * 0.1);
                    particle.x = this.x + this.squareSize/2 + Math.cos(particle.angle) * radius;
                    particle.y = this.y + this.squareSize/2 + Math.sin(particle.angle) * radius;
                }
            }
        }

        // Update fire particles
        if (this.isYellow && this.fireParticles) {
            // Activate new fire particles
            for (let i = 0; i < 2; i++) {
                const particle = this.fireParticles[this.fireParticleIndex];
                if (!particle.active) {
                    particle.x = this.x + this.squareSize/2;
                    particle.y = this.y + this.squareSize/2;
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 0.5 + Math.random() * 1;
                    particle.dx = Math.cos(angle) * speed;
                    particle.dy = Math.sin(angle) * speed - 1;
                    particle.life = particle.maxLife;
                    particle.active = true;
                }
                this.fireParticleIndex = (this.fireParticleIndex + 1) % this.fireParticleCount;
            }

            // Update existing fire particles
            for (let i = 0; i < this.fireParticleCount; i++) {
                const particle = this.fireParticles[i];
                if (particle.active) {
                    particle.x += particle.dx * (deltaTime / 16.67);
                    particle.y += particle.dy * (deltaTime / 16.67);
                    particle.life -= deltaTime / 1000;
                    
                    if (particle.life <= 0) {
                        particle.active = false;
                    }
                }
            }
        }

        // Update position
        this.x += this.dx * (deltaTime / 16.67);
        this.y += this.dy * (deltaTime / 16.67);
        this.rotation += this.rotationSpeed * (deltaTime / 16.67);

        // Bounce off walls
        if (this.x <= 0) {
            this.x = 0;
            this.dx = Math.abs(this.dx);
        } else if (this.x >= canvasWidth - this.squareSize) {
            this.x = canvasWidth - this.squareSize;
            this.dx = -Math.abs(this.dx);
        }

        if (this.y <= 0) {
            this.y = 0;
            this.dy = Math.abs(this.dy);
        } else if (this.y >= canvasHeight - this.squareSize) {
            this.y = canvasHeight - this.squareSize;
            this.dy = -Math.abs(this.dy);
        }
    }

    draw(ctx, rainbowHue, shakeX, shakeY) {
        // Draw trail
        for (let i = 0; i < this.trailLength; i++) {
            const index = (this.trailIndex + i) % this.trailLength;
            const segment = this.trail[index];
            
            ctx.save();
            ctx.translate(segment.x + this.squareSize/2 + shakeX, segment.y + this.squareSize/2 + shakeY);
            ctx.rotate(segment.rotation * Math.PI / 180);
            
            ctx.globalAlpha = segment.alpha * 0.25 * this.fadeIn;
            
            let shadowColor, fillColor;
            if (this.isRainbow) {
                const hue = (rainbowHue + (segment.alpha * 360)) % 360;
                shadowColor = `hsl(${hue}, 100%, 50%)`;
                fillColor = `hsla(${hue}, 100%, 50%, 0.25)`;
            } else if (this.isYellow) {
                shadowColor = '#FFD700';
                fillColor = 'rgba(255, 215, 0, 0.25)';
            } else if (this.isPurifier) {
                shadowColor = '#87CEEB';
                fillColor = 'rgba(135, 206, 235, 0.25)';
            } else {
                shadowColor = this.isDangerous ? '#FF0000': '#00FF00';
                fillColor = this.isDangerous ? 'rgba(255, 0, 0, 0.25)' : 'rgba(0, 255, 0, 0.25)';
            }
            
            // ctx.shadowColor = shadowColor;
            // ctx.shadowBlur = 20;
            ctx.fillStyle = fillColor;
            ctx.fillRect(-this.squareSize/2, -this.squareSize/2, this.squareSize, this.squareSize);
            
            ctx.restore();
        }

        // Draw main square
        ctx.save();
        ctx.translate(this.x + this.squareSize/2 + shakeX, this.y + this.squareSize/2 + shakeY);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        ctx.globalAlpha = this.fadeIn;
        
        let shadowColor, fillColor, strokeColor;
        if (this.isRainbow) {
            const hue = rainbowHue;
            shadowColor = `hsl(${hue}, 100%, 50%)`;
            fillColor = `hsla(${hue}, 100%, 50%, 0.25)`;
            strokeColor = `hsl(${hue}, 100%, 50%)`;
        } else if (this.isYellow) {
            shadowColor = '#FFD700';
            fillColor = 'rgba(255, 215, 0, 0.25)';
            strokeColor = '#FFD700';
        } else if (this.isPurifier) {
            shadowColor = '#87CEEB';
            fillColor = 'rgba(135, 206, 235, 0.25)';
            strokeColor = '#87CEEB';
        } else {
            shadowColor = this.isDangerous ? '#FF0000': '#00FF00';
            fillColor = this.isDangerous ? 'rgba(255, 0, 0, 0.25)' : 'rgba(0, 255, 0, 0.25)';
            strokeColor = this.isDangerous ? '#FF0000' : '#00FF00';
        }
        
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = fillColor;
        ctx.fillRect(-this.squareSize/2, -this.squareSize/2, this.squareSize, this.squareSize);
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.squareSize/2, -this.squareSize/2, this.squareSize, this.squareSize);
        
        ctx.restore();

        // Draw fire particles
        if (this.isYellow && this.fireParticles) {
            for (let i = 0; i < this.fireParticleCount; i++) {
                const particle = this.fireParticles[i];
                if (particle.active) {
                    const alpha = particle.life / particle.maxLife;
                    ctx.save();
                    ctx.globalAlpha = alpha * this.fadeIn;
                    
                    const gradient = ctx.createRadialGradient(
                        particle.x + shakeX, particle.y + shakeY, 0,
                        particle.x + shakeX, particle.y + shakeY, particle.size
                    );
                    
                    gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, ${alpha})`);
                    gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(particle.x + shakeX, particle.y + shakeY, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.restore();
                }
            }
        }

        // Draw frost particles
        if (this.isPurifier && this.frostParticles) {
            for (let i = 0; i < this.frostParticleCount; i++) {
                const particle = this.frostParticles[i];
                if (particle.active) {
                    ctx.save();
                    ctx.translate(particle.x + shakeX, particle.y + shakeY);
                    ctx.rotate(particle.rotation);
                    
                    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                    gradient.addColorStop(0.5, 'rgba(200, 255, 255, 0.4)');
                    gradient.addColorStop(1, 'rgba(200, 255, 255, 0)');
                    
                    ctx.fillStyle = gradient;
                    
                    for (let j = 0; j < 6; j++) {
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(particle.size, 0);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.rotate(Math.PI / 3);
                    }
                    
                    ctx.restore();
                }
            }
        }
    }

    checkCollision(otherSquare) {
        const dx = (this.x + this.squareSize/2) - (otherSquare.x + this.squareSize/2);
        const dy = (this.y + this.squareSize/2) - (otherSquare.y + this.squareSize/2);
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared < this.squareSize * this.squareSize) {
            const distance = Math.sqrt(distanceSquared);
            
            // Calculate collision normal
            const nx = dx / distance;
            const ny = dy / distance;

            // Calculate relative velocity
            const relativeVelocityX = this.dx - otherSquare.dx;
            const relativeVelocityY = this.dy - otherSquare.dy;

            // Calculate relative velocity in terms of the normal direction
            const velocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny;

            // Do not resolve if velocities are separating
            if (velocityAlongNormal > 0) return false;

            // Calculate restitution (bounciness)
            const restitution = 0.3;

            // Calculate impulse scalar
            const impulseScalar = -(1 + restitution) * velocityAlongNormal;

            // Apply impulse
            const impulseX = impulseScalar * nx;
            const impulseY = impulseScalar * ny;

            // Store original speeds
            const thisOriginalSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
            const otherOriginalSpeed = Math.sqrt(otherSquare.dx * otherSquare.dx + otherSquare.dy * otherSquare.dy);

            // Update velocities
            this.dx += impulseX;
            this.dy += impulseY;
            otherSquare.dx -= impulseX;
            otherSquare.dy -= impulseY;

            // Normalize velocities to maintain original speeds
            const thisNewSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
            const otherNewSpeed = Math.sqrt(otherSquare.dx * otherSquare.dx + otherSquare.dy * otherSquare.dy);

            if (thisNewSpeed > 0) {
                this.dx = (this.dx / thisNewSpeed) * thisOriginalSpeed;
                this.dy = (this.dy / thisNewSpeed) * thisOriginalSpeed;
            }

            if (otherNewSpeed > 0) {
                otherSquare.dx = (otherSquare.dx / otherNewSpeed) * otherOriginalSpeed;
                otherSquare.dy = (otherSquare.dy / otherNewSpeed) * otherOriginalSpeed;
            }

            // Move squares apart to prevent sticking
            const overlap = this.squareSize - distance;
            const moveX = nx * overlap * 0.5;
            const moveY = ny * overlap * 0.5;

            this.x += moveX;
            this.y += moveY;
            otherSquare.x -= moveX;
            otherSquare.y -= moveY;

            return true;
        }
        return false;
    }
}

export default Square; 