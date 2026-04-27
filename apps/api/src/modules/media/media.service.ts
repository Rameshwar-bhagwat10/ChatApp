interface MediaUploadResult {
	mediaId: string;
	url: string;
	status: 'queued';
}

export const mediaService = {
	upload: async (): Promise<MediaUploadResult> => ({
		mediaId: 'media-phase-1',
		url: 'https://cdn.example.com/media-phase-1',
		status: 'queued',
	}),
};
