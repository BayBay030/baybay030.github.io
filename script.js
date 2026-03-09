document.addEventListener('DOMContentLoaded', () => {
    const pet = document.getElementById('pet');
    const container = document.body; // Use body as boundary

    // State
    let isDragging = false;
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight * 0.8;
    let targetX = currentX;
    let targetY = currentY;
    let velocityX = 0;
    let velocityY = 0;
    let moveInterval;
    let idleTimeout;

    // Initial Position
    updatePetPosition();

    // --- Dragging Logic ---
    let startX, startY, initialPetX, initialPetY;

    pet.addEventListener('mousedown', startDrag);
    pet.addEventListener('touchstart', startDrag, { passive: false });

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    function startDrag(e) {
        isDragging = true;
        pet.style.transition = 'none'; // Disable transition for direct control

        // Change to grabbed state
        pet.src = 'assets/pet_grab.gif?v=1';

        // Get input coordinates
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        // Get current pet position (parsed from style or current vars)
        initialPetX = currentX;
        initialPetY = currentY;

        // Stop autonomous movement
        clearInterval(moveInterval);
        clearTimeout(idleTimeout);

        // Prevent default to stop scrolling on mobile
        if (e.type === 'touchstart') e.preventDefault();

        updatePetPosition();
    }

    function drag(e) {
        if (!isDragging) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        currentX = initialPetX + deltaX;
        currentY = initialPetY + deltaY;

        updatePetPosition();
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        pet.style.transition = 'transform 0.2s ease-out'; // Smooth release

        // Revert to normal state
        pet.src = 'assets/pet.gif?v=1';

        // Start wandering again after a delay
        startWandering();
    }

    // --- Movement Logic ---
    function updatePetPosition() {
        // Boundary checks
        const padding = 40;
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        const minX = padding;
        const minY = padding;

        if (!isDragging) {
            // Keep within bounds if it drifted out
            if (currentX < minX) currentX = minX;
            if (currentX > maxX) currentX = maxX;
            if (currentY < minY) currentY = minY;
            if (currentY > maxY) currentY = maxY;
        }

        pet.style.left = `${currentX}px`;
        pet.style.top = `${currentY}px`;

        if (isDragging) {
            // Offset to bottom-left to avoid blocking cursor
            pet.style.transform = 'translate(-80%, 20%) scale(1.1)';
        } else {
            // Flip sprite based on direction
            if (targetX > currentX) {
                pet.style.transform = 'translate(-50%, -50%) scaleX(1)'; // Face right (flipped)
            } else {
                pet.style.transform = 'translate(-50%, -50%) scaleX(-1)'; // Face left (original)
            }
        }
    }

    function pickNewTarget() {
        const padding = 50;
        targetX = Math.random() * (window.innerWidth - padding * 2) + padding;
        targetY = Math.random() * (window.innerHeight - padding * 2) + padding;
    }

    function moveStep() {
        if (isDragging) return;

        const speed = 2; // Pixels per frame
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            // Reached target, wait a bit then pick new one
            clearInterval(moveInterval);
            idleTimeout = setTimeout(startWandering, Math.random() * 2000 + 1000);
            return;
        }

        // Normalize and move
        velocityX = (dx / distance) * speed;
        velocityY = (dy / distance) * speed;

        currentX += velocityX;
        currentY += velocityY;

        updatePetPosition();
    }

    function startWandering() {
        pickNewTarget();
        clearInterval(moveInterval);
        moveInterval = setInterval(moveStep, 20); // 50fps
    }

    // Handle Window Resize
    window.addEventListener('resize', () => {
        // Keep pet on screen
        currentX = Math.min(currentX, window.innerWidth - 40);
        currentY = Math.min(currentY, window.innerHeight - 40);
        updatePetPosition();
    });

    // Start!
    startWandering();
});
