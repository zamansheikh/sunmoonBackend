export const postStructure  = {
    $project: {
        _id: 1,
        ownerId: 1,
        postCaption: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        reactionCount: 1,
        commentCount: 1,
        topRank: 1,
        latestReactions: 1,
        mediaUrl: 1,
        myReaction: {
            reactionType: 1
        },
       userName: 1,
       avatar: 1,
       // Author profile extras so the post card can render the real
       // level pill and SVIP tag (resolved by lookupRichUser into
       // { svgaUrl, previewUrl } objects).
       level: 1,
       equippedStoreItems: 1,
    }
};


export const postReactionStructure = {
    reactedBy: 1,
    reactedTo: 1,
    reactionType: 1,
    createdAt: 1,
    userName: 1,
    avatar: 1
}