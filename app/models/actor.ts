export type Actor = {
    id: number;
    name: string;
    // Bare image UUID; build the URL with getActorImageUrl
    pictureUrl?: string | null;
}

export const ActorParams = 'id, name, pictureUrl';
