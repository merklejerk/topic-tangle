export const load = async ({ params }: { params: { id: string } }) => {
	return {
		tangleId: params.id
	};
};
