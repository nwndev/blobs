// Get references to the HTML elements
const gameContainer = document.getElementById('gameContainer');
const clickerImage = document.getElementById('clickerImage');
const scoreDisplay = document.getElementById('scoreDisplay');
const scoreDisplayContainer = document.getElementById('scoreDisplayContainer');
const cumulativeFeedback = document.getElementById('cumulativeFeedback');
const shopButton = document.getElementById('shopButton');
const shopModal = document.getElementById('shopModal');
const closeModalButton = document.getElementById('closeModal');
const upgrade1Badge = document.getElementById('upgrade1Badge');
const upgrade2Badge = document.getElementById('upgrade2Badge');
const upgrade1PriceDisplay = document.getElementById('upgrade1Price');
const upgrade2PriceDisplay = document.getElementById('upgrade2Price');
const buyUpgrade1Button = document.getElementById('buyUpgrade1');
const buyUpgrade2Button = document.getElementById('buyUpgrade2');
const upgrade1Progress = document.getElementById('upgrade1Progress');
const upgrade2Progress = document.getElementById('upgrade2Progress');
const mobileWarningModal = document.getElementById('mobileWarningModal');
const closeMobileWarningButton = document.getElementById('closeMobileWarning');

// Get references to the images to apply the filter
const blobImage = document.getElementById('blobImage');
const powerIcon = document.getElementById('powerIcon');

// Initialize the game state
let points = 0;
let pendingPoints = 0;
let timer = null;
let clicksSinceLastSpawn = 0;
const initialClicksToNextSpawn = 10;
let clicksToNextSpawn = initialClicksToNextSpawn;

// Upgrade variables
let upgrade1Level = 0;
let upgrade2Level = 0;
const upgrade1BasePrice = 250;
const upgrade2BasePrice = 500;
const priceMultiplier = 1.5;
const upgradeBoost = 0.20;

// Click value variables, now dynamic based on upgrades
let baseClickValue = 1;
let currentClickValue = 1;
let spawnBoostMultiplier = 1.5;

const flyingImages = [];
const maxFlyingImages = 5;
let maxSpawnSoundPlayed = false;

// Progress bar variables
const holdDuration = 1000; // 1 second
const updateInterval = 50; // Update every 50ms
let upgrade1HoldTimer = null;
let upgrade2HoldTimer = null;
let upgrade1ProgressValue = 0;
let upgrade2ProgressValue = 0;

// Create a new Audio object for the sound effect when an image spawns
// Path updated to the new 'assets/sounds' folder
const spawnSound = new Audio('assets/sounds/spawns.mp3');

// Create a new Audio object for the sound effect on each click
// Path updated to the new 'assets/sounds' folder
const clickSound = new Audio('assets/sounds/clicks.mp3');

// Create a new Audio object for the score update sound
// Path updated to the new 'assets/sounds' folder
const scoreSound = new Audio('assets/sounds/score.mp3');

// Audio object for the sound when max flying images are reached
// Path updated to the new 'assets/sounds' folder
const maxSpawnSound = new Audio('assets/sounds/reachmax.mp3');

// Audio objects for the shop
// Path updated to the new 'assets/sounds' folder
const buySound = new Audio('assets/sounds/buy.mp3');
// Path updated to the new 'assets/sounds' folder
const errorSound = new Audio('assets/sounds/error.mp3');
// Path updated to the new 'assets/sounds' folder
const boughtSound = new Audio('assets/sounds/bought.mp3');

// Function to play the spawn sound effect
const playSpawnSound = () => {
    spawnSound.currentTime = 0;
    spawnSound.play();
};

// Function to play the click sound effect
const playClickSound = () => {
    // Path updated to the new 'assets/sounds' folder
    const newClickSound = new Audio('assets/sounds/clicks.mp3');
    newClickSound.play();
    newClickSound.addEventListener('ended', () => {
        newClickSound.remove();
    });
};

// Function to play the score sound effect
const playScoreSound = () => {
    scoreSound.currentTime = 0;
    scoreSound.play();
};

// Function to play the max spawn sound effect
const playMaxSpawnSound = () => {
    maxSpawnSound.currentTime = 0;
    maxSpawnSound.play();
};

// Function to play buy sound
const playBuySound = () => {
    buySound.currentTime = 0;
    buySound.play();
};

// Function to play error sound
const playErrorSound = () => {
    errorSound.currentTime = 0;
    errorSound.play();
};

// Function to play the sound for a successful purchase
const playBoughtSound = () => {
    boughtSound.currentTime = 0;
    boughtSound.play();
};

// Function to update the score display and trigger the glow and scale animation
function updateScoreDisplay() {
    scoreDisplay.textContent = Math.round(points).toLocaleString(); // Use toLocaleString for better number formatting
    scoreDisplay.classList.add('score-glow');

    setTimeout(() => {
        scoreDisplay.classList.remove('score-glow');
    }, 500);
}

// Function to animate the score count-up
function animateScore(start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentNumber = Math.floor(progress * (end - start) + start);
        scoreDisplay.textContent = currentNumber.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            scoreDisplay.textContent = Math.round(end).toLocaleString();
            updateScoreDisplay();
            playScoreSound();
        }
    };
    window.requestAnimationFrame(step);
}

// Function to animate the cumulative feedback count-down
function animateFeedbackDown(start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentNumber = Math.ceil(start - (progress * (start - end)));
        cumulativeFeedback.textContent = currentNumber;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            cumulativeFeedback.textContent = end;
            cumulativeFeedback.classList.add('feedback-fade-out');
            setTimeout(() => {
                cumulativeFeedback.classList.remove('feedback-visible');
                cumulativeFeedback.classList.remove('feedback-fade-out');
                cumulativeFeedback.textContent = '';
            }, 2000);
        }
    };
    window.requestAnimationFrame(step);
}

// Function to update the cumulative feedback display
function updateCumulativeFeedback() {
    if (pendingPoints > 0) {
        cumulativeFeedback.textContent = Math.round(pendingPoints);
        cumulativeFeedback.classList.add('feedback-visible');
        cumulativeFeedback.classList.remove('feedback-fade-out');
    } else {
        cumulativeFeedback.classList.remove('feedback-visible');
        cumulativeFeedback.textContent = '';
        cumulativeFeedback.classList.remove('feedback-fade-out');
    }
}

// Function to create and play the ripple animation
function showRipple() {
    const rippleElement = document.createElement('div');
    rippleElement.classList.add('ripple-effect');
    clickerImage.appendChild(rippleElement);

    setTimeout(() => {
        rippleElement.remove();
    }, 800);
}

// Function to create and place a flying image
function createFlyingImage() {
    if (flyingImages.length >= maxFlyingImages) {
        return;
    }

    playSpawnSound();

    const img = document.createElement('img');
    // Path updated to the new 'assets/images' folder
    img.src = 'assets/images/power.png';
    img.alt = 'Small flying image';
    img.classList.add('flying-image', 'spawn-glow');

    const scoreRect = scoreDisplayContainer.getBoundingClientRect();

    const imageWidth = 30;
    const spacing = 10;

    const totalWidth = (maxFlyingImages * imageWidth) + ((maxFlyingImages - 1) * spacing);

    const startX = scoreRect.left + (scoreRect.width / 2) - (totalWidth / 2);
    const startY = scoreRect.bottom + 20;

    const currentX = startX + (flyingImages.length * (imageWidth + spacing));

    img.style.left = `${currentX}px`;
    img.style.top = `${startY}px`;

    document.body.appendChild(img);
    flyingImages.push(img);
}

// Function to toggle the max spawns effect
function toggleMaxSpawnsEffect(isActive) {
    if (isActive) {
        gameContainer.classList.add('text-aberration-active');
        gameContainer.classList.add('image-aberration-active');
    } else {
        gameContainer.classList.remove('text-aberration-active');
        gameContainer.classList.remove('image-aberration-active');
    }
}

// Function to update game stats based on upgrades
function updateGameStats() {
    baseClickValue = 1 * (1 + upgrade1Level * upgradeBoost);
    spawnBoostMultiplier = 1.5 * (1 + upgrade2Level * upgradeBoost);
    currentClickValue = baseClickValue;
}

// Function to update the shop UI
function updateShopUI() {
    upgrade1Badge.textContent = `Lv.${upgrade1Level}`;
    upgrade2Badge.textContent = `Lv.${upgrade2Level}`;

    const upgrade1Price = Math.round(upgrade1BasePrice * Math.pow(priceMultiplier, upgrade1Level));
    const upgrade2Price = Math.round(upgrade2BasePrice * Math.pow(priceMultiplier, upgrade2Level));

    upgrade1PriceDisplay.textContent = upgrade1Price.toLocaleString();
    upgrade2PriceDisplay.textContent = upgrade2Price.toLocaleString();

    // Update button states
    buyUpgrade1Button.disabled = points < upgrade1Price;
    buyUpgrade2Button.disabled = points < upgrade2Price;
}

// Function to show the shop modal with animation
function showShopModal() {
    shopModal.style.display = 'flex';
    shopModal.classList.remove('hide');
    shopModal.classList.add('show');
    updateShopUI();
}

// Function to hide the shop modal with animation
function hideShopModal() {
    shopModal.classList.remove('show');
    shopModal.classList.add('hide');
    shopModal.addEventListener('animationend', () => {
        shopModal.style.display = 'none';
    }, { once: true });
}

// Function to apply the glow effect after a purchase
function applyPurchaseGlow(buttonElement) {
    buttonElement.classList.add('purchase-glow');
    buttonElement.addEventListener('animationend', () => {
        buttonElement.classList.remove('purchase-glow');
    }, { once: true });
}

// Function to handle buying upgrade 1
function buyUpgrade1() {
    const price = Math.round(upgrade1BasePrice * Math.pow(priceMultiplier, upgrade1Level));
    if (points >= price) {
        points -= price;
        upgrade1Level++;
        updateGameStats();
        updateScoreDisplay();
        updateShopUI();
        playBoughtSound(); // Play the new sound on success
        applyPurchaseGlow(buyUpgrade1Button);
    } else {
        playErrorSound();
    }
}

// Function to handle buying upgrade 2
function buyUpgrade2() {
    const price = Math.round(upgrade2BasePrice * Math.pow(priceMultiplier, upgrade2Level));
    if (points >= price) {
        points -= price;
        upgrade2Level++;
        updateGameStats();
        updateScoreDisplay();
        updateShopUI();
        playBoughtSound(); // Play the new sound on success
        applyPurchaseGlow(buyUpgrade2Button);
    } else {
        playErrorSound();
    }
}

// Function to check if the device is mobile and show a warning
function checkDeviceAndWarn() {
    const isMobile = window.innerWidth <= 768; // Common breakpoint for tablets/phones
    if (isMobile) {
        mobileWarningModal.classList.remove('hidden');
        mobileWarningModal.classList.add('show');
    } else {
        mobileWarningModal.classList.remove('show');
        mobileWarningModal.classList.add('hidden');
    }
}

// A generic function to handle the "click" logic for both mouse and touch
function handleImageInteraction() {
    playClickSound();
    pendingPoints += currentClickValue;
    clicksSinceLastSpawn += 1;
    updateCumulativeFeedback();
    showRipple();

    if (clicksSinceLastSpawn >= clicksToNextSpawn && flyingImages.length < maxFlyingImages) {
        createFlyingImage();
        clicksSinceLastSpawn = 0;
        clicksToNextSpawn *= 2;
        currentClickValue *= spawnBoostMultiplier;
    }

    if (flyingImages.length === maxFlyingImages) {
        if (!maxSpawnSoundPlayed) {
            playMaxSpawnSound();
            maxSpawnSoundPlayed = true;
        }
        toggleMaxSpawnsEffect(true);
        blobImage.classList.add('blob-pulse');
        blobImage.addEventListener('animationend', () => {
            blobImage.classList.remove('blob-pulse');
        }, { once: true });
    }
}

// A generic function to handle the "cash in" logic for both mouse and touch
function handleCashIn() {
    clearTimeout(timer);
    toggleMaxSpawnsEffect(false);

    timer = setTimeout(() => {
        if (pendingPoints > 0) {
            const currentScore = points;
            points += Math.round(pendingPoints);
            animateScore(currentScore, points, 500);
            animateFeedbackDown(Math.round(pendingPoints), 0, 500);
            pendingPoints = 0;

            currentClickValue = baseClickValue;
            clicksToNextSpawn = initialClicksToNextSpawn;
            maxSpawnSoundPlayed = false;

            const scoreRect = scoreDisplayContainer.getBoundingClientRect();
            const targetX = scoreRect.left + (scoreRect.width / 2);
            const targetY = scoreRect.top + (scoreRect.height / 2);

            flyingImages.forEach(img => {
                const imgRect = img.getBoundingClientRect();
                const dx = targetX - (imgRect.left + imgRect.width / 2);
                const dy = targetY - (imgRect.top + imgRect.height / 2);

                img.style.transform = `translate(${dx}px, ${dy}px)`;
                img.style.opacity = '0';

                img.addEventListener('transitionend', () => {
                    img.remove();
                });
            });

            flyingImages.length = 0;
        }
    }, 2000);
}

// Event listeners for desktop users
clickerImage.addEventListener('mousedown', handleImageInteraction);
clickerImage.addEventListener('mouseup', handleCashIn);
clickerImage.addEventListener('mouseleave', handleCashIn);

// Event listeners for mobile/touchscreen users
clickerImage.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevents default browser behaviors like zooming
    handleImageInteraction();
});
clickerImage.addEventListener('touchend', handleCashIn);
clickerImage.addEventListener('touchcancel', handleCashIn);

// Event listeners for the shop buttons
shopButton.addEventListener('click', showShopModal);
closeModalButton.addEventListener('click', hideShopModal);
closeMobileWarningButton.addEventListener('click', () => {
    mobileWarningModal.classList.remove('show');
    mobileWarningModal.classList.add('hide');
});

// Hold-to-buy logic for Upgrade 1
buyUpgrade1Button.addEventListener('mousedown', () => {
    if (buyUpgrade1Button.disabled) return;
    upgrade1HoldTimer = setInterval(() => {
        upgrade1ProgressValue += updateInterval;
        const progress = (upgrade1ProgressValue / holdDuration) * 100;
        upgrade1Progress.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(upgrade1HoldTimer);
            buyUpgrade1();
            resetProgressBar(upgrade1Progress);
        }
    }, updateInterval);
});
buyUpgrade1Button.addEventListener('mouseup', () => {
    clearInterval(upgrade1HoldTimer);
    resetProgressBar(upgrade1Progress);
});
buyUpgrade1Button.addEventListener('mouseleave', () => {
    clearInterval(upgrade1HoldTimer);
    resetProgressBar(upgrade1Progress);
});

// Touch events for mobile support
buyUpgrade1Button.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (buyUpgrade1Button.disabled) return;
    upgrade1HoldTimer = setInterval(() => {
        upgrade1ProgressValue += updateInterval;
        const progress = (upgrade1ProgressValue / holdDuration) * 100;
        upgrade1Progress.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(upgrade1HoldTimer);
            buyUpgrade1();
            resetProgressBar(upgrade1Progress);
        }
    }, updateInterval);
});
buyUpgrade1Button.addEventListener('touchend', () => {
    clearInterval(upgrade1HoldTimer);
    resetProgressBar(upgrade1Progress);
});
buyUpgrade1Button.addEventListener('touchcancel', () => {
    clearInterval(upgrade1HoldTimer);
    resetProgressBar(upgrade1Progress);
});


// Hold-to-buy logic for Upgrade 2
buyUpgrade2Button.addEventListener('mousedown', () => {
    if (buyUpgrade2Button.disabled) return;
    upgrade2HoldTimer = setInterval(() => {
        upgrade2ProgressValue += updateInterval;
        const progress = (upgrade2ProgressValue / holdDuration) * 100;
        upgrade2Progress.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(upgrade2HoldTimer);
            buyUpgrade2();
            resetProgressBar(upgrade2Progress);
        }
    }, updateInterval);
});
buyUpgrade2Button.addEventListener('mouseup', () => {
    clearInterval(upgrade2HoldTimer);
    resetProgressBar(upgrade2Progress);
});
buyUpgrade2Button.addEventListener('mouseleave', () => {
    clearInterval(upgrade2HoldTimer);
    resetProgressBar(upgrade2Progress);
});

// Touch events for mobile support
buyUpgrade2Button.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (buyUpgrade2Button.disabled) return;
    upgrade2HoldTimer = setInterval(() => {
        upgrade2ProgressValue += updateInterval;
        const progress = (upgrade2ProgressValue / holdDuration) * 100;
        upgrade2Progress.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(upgrade2HoldTimer);
            buyUpgrade2();
            resetProgressBar(upgrade2Progress);
        }
    }, updateInterval);
});
buyUpgrade2Button.addEventListener('touchend', () => {
    clearInterval(upgrade2HoldTimer);
    resetProgressBar(upgrade2Progress);
});
buyUpgrade2Button.addEventListener('touchcancel', () => {
    clearInterval(upgrade2HoldTimer);
    resetProgressBar(upgrade2Progress);
});

// Helper function to reset the progress bar
function resetProgressBar(progressBarElement) {
    progressBarElement.style.width = '0%';
    // Reset the progress value variable
    if (progressBarElement.id === 'upgrade1Progress') {
        upgrade1ProgressValue = 0;
    } else {
        upgrade2ProgressValue = 0;
    }
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    updateGameStats();
    updateScoreDisplay();
    checkDeviceAndWarn();
});

window.addEventListener('resize', checkDeviceAndWarn);
