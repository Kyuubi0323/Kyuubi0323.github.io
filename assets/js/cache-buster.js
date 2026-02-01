/**
 * Cache-busting utilities to ensure fresh content loading
 */

(function() {
    'use strict';
    
    // Add cache-busting parameters to dynamic requests
    function addCacheBuster(url) {
        const separator = url.includes('?') ? '&' : '?';
        const timestamp = Date.now();
        return `${url}${separator}cb=${timestamp}`;
    }
    
    // Force reload of feeds and dynamic content
    function bustFeedCache() {
        const feeds = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
        feeds.forEach(feed => {
            const href = feed.getAttribute('href');
            if (href && !href.includes('cb=')) {
                feed.setAttribute('href', addCacheBuster(href));
            }
        });
    }
    
    // Clear any existing service worker cache if needed
    function clearServiceWorkerCache() {
        if ('serviceWorker' in navigator && 'caches' in window) {
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Clearing cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                console.log('All caches cleared');
                // Force service worker to skip waiting and activate
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        command: 'SKIP_WAITING'
                    });
                }
            });
        }
    }
    
    // Add version parameter to important resources
    function versionResources() {
        const version = document.querySelector('meta[name="version"]')?.content || Date.now();
        
        // Version CSS files (if any dynamic ones exist)
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"][href*="/assets/"]');
        cssLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.includes('v=')) {
                link.setAttribute('href', `${href}${href.includes('?') ? '&' : '?'}v=${version}`);
            }
        });
    }
    
    // Check if content is stale and suggest refresh
    function checkContentFreshness() {
        const buildTime = document.querySelector('meta[name="build-time"]')?.content;
        if (buildTime) {
            const buildTimestamp = parseInt(buildTime) * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            const ageInHours = (currentTime - buildTimestamp) / (1000 * 60 * 60);
            
            // If content is older than 24 hours, suggest refresh
            if (ageInHours > 24) {
                console.log('Content may be stale. Last build:', new Date(buildTimestamp));
            }
        }
    }
    
    // Initialize cache busting when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        bustFeedCache();
        versionResources();
        checkContentFreshness();
        
        // Clear service worker cache on demand (uncomment if needed)
        // clearServiceWorkerCache();
    });
    
    // Handle visibility change to check for updates
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkContentFreshness();
        }
    });
    
})();
