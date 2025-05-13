// src/hooks/useSmoothScroll.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook untuk mengatur smooth scrolling behavior pada level komponen
 * @param {Object} options - Opsi konfigurasi
 * @param {boolean} options.enabled - Mengaktifkan/menonaktifkan smooth scroll
 * @param {number} options.top - Posisi scroll top saat komponen mount (default: 0)
 * @param {string} options.behavior - Behavior scrolling ('smooth' atau 'auto')
 * @param {boolean} options.scrollOnMount - Apakah harus scroll saat komponen mount
 * @param {boolean} options.scrollOnPathChange - Apakah harus scroll saat path berubah
 * @param {string} options.selector - Selector elemen yang akan diberi smooth scroll
 * @returns {Object} Helper functions dan state
 */
export function useSmoothScroll({
    enabled = true,
    top = 0,
    behavior = 'smooth',
    scrollOnMount = true,
    scrollOnPathChange = true,
    selector = null
} = {}) {
    const location = useLocation();
    const prevPathRef = useRef(location.pathname);

    // Fungsi untuk melakukan scroll
    const scrollToPosition = (position = 0, scrollBehavior = behavior) => {
        if (!enabled) return;

        if (selector) {
            const element = document.querySelector(selector);
            if (element) {
                element.scrollTo({
                    top: position,
                    behavior: scrollBehavior
                });
            }
        } else {
            window.scrollTo({
                top: position,
                behavior: scrollBehavior
            });
        }
    };

    // Scroll ketika komponen mount
    useEffect(() => {
        if (enabled && scrollOnMount) {
            scrollToPosition(top);
        }

        // Apply smooth scroll styling to specific element
        if (enabled && selector) {
            const element = document.querySelector(selector);
            if (element) {
                const originalStyle = element.style.scrollBehavior;
                element.style.scrollBehavior = behavior;

                return () => {
                    element.style.scrollBehavior = originalStyle;
                };
            }
        }
    }, [enabled, scrollOnMount]);

    // Scroll ketika path berubah
    useEffect(() => {
        const currentPath = location.pathname;

        if (enabled && scrollOnPathChange && prevPathRef.current !== currentPath) {
            scrollToPosition(top);
        }

        prevPathRef.current = currentPath;
    }, [location.pathname, enabled, scrollOnPathChange]);

    // Helper untuk scroll ke elemen dengan ID
    const scrollToElement = (elementId, offset = 0) => {
        if (!enabled) return;

        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            scrollToPosition(offsetPosition);
        }
    };

    return {
        scrollToPosition,
        scrollToElement,
        enabled
    };
}