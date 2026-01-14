/**
 * Utility functions for WhatsApp Media handling
 * Used to retrieve media files from Meta's servers
 */

/**
 * Get the download URL for a WhatsApp media file
 * @param mediaId - The media ID from the WhatsApp webhook payload
 * @returns The URL to download the media file, or null if failed
 */
export async function getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
        console.error('WHATSAPP_ACCESS_TOKEN is not configured');
        return null;
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/${mediaId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            console.error('Failed to get media URL:', response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        return data.url || null;

    } catch (error) {
        console.error('Error fetching media URL:', error);
        return null;
    }
}
