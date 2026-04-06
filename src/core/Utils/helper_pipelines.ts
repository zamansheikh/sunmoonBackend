import { DatabaseNames } from "./enums";
/**
 * Returns a sub-pipeline that:
 * - Matches a user by _id (using let variable)
 * - Looks up equipped store items
 * - Transforms them into the desired { categoryName: svgaFile } object
 * - Returns a clean user object with equippedStoreItems field
 */
export const userWithEquippedItemsPipeline = (
  userIdVarName: string = "userId",
) => [
  {
    $match: {
      $expr: { $eq: ["$_id", `$$${userIdVarName}`] },
    },
  },

  // Lookup equipped items
  {
    $lookup: {
      from: DatabaseNames.MyBucketItem,
      let: { ownerId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$ownerId", "$$ownerId"] },
                { $eq: ["$useStatus", true] },
              ],
            },
          },
        },

        // Get StoreItem + category
        {
          $lookup: {
            from: DatabaseNames.StoreItem,
            let: { itemId: "$itemId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$itemId"] },
                },
              },
              {
                $lookup: {
                  from: DatabaseNames.StoreCategory,
                  localField: "categoryId",
                  foreignField: "_id",
                  as: "category",
                },
              },
              {
                $unwind: {
                  path: "$category",
                  preserveNullAndEmptyArrays: true,
                },
              },

              // The transformation you want
              {
                $project: {
                  mapped: {
                    $cond: {
                      if: { $gt: [{ $size: { $ifNull: ["$bundleFiles", []] } }, 0] },
                      then: {
                        $arrayToObject: {
                          $map: {
                            input: "$bundleFiles",
                            as: "b",
                            in: {
                              k: "$$b.categoryName",
                              v: "$$b.svgaFile",
                            },
                          },
                        },
                      },
                      else: {
                        $cond: {
                          if: "$svgaFile",
                          then: {
                            $arrayToObject: {
                              $map: {
                                input: [1],
                                as: "dummy",
                                in: {
                                  k: { $ifNull: ["$category.title", "Unknown"] },
                                  v: "$svgaFile",
                                },
                              },
                            },
                          },
                          else: {},
                        },
                      },
                    },
                  },
                  privilege: { $ifNull: ["$privilege", []] },
                },
              },
            ],
            as: "equippedItem",
          },
        },
        {
          $unwind: {
            path: "$equippedItem",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: { newRoot: { $ifNull: ["$equippedItem", { mapped: {}, privilege: [] }] } },
        },
      ],
      as: "equippedStoreItems",
    },
  },
  {
    $addFields: {
      equippedStoreItems: {
        $mergeObjects: [
          { $mergeObjects: "$equippedStoreItems.mapped" },
          {
            $let: {
              vars: {
                mergedPrivileges: {
                  $reduce: {
                    input: { $ifNull: ["$equippedStoreItems.privilege", []] },
                    initialValue: [],
                    in: { $setUnion: ["$$value", { $ifNull: ["$$this", []] }] },
                  },
                },
              },
              in: {
                $cond: {
                  if: { $gt: [{ $size: "$$mergedPrivileges" }, 0] },
                  then: { privilege: "$$mergedPrivileges" },
                  else: {},
                },
              },
            },
          },
        ],
      },
    },
  },

  // Optional: project only fields you want in the final user object
  {
    $project: {
      _id: 1,
      name: 1,
      uid: 1,
      avatar: 1,
      level: 1,
      coverPicture: 1,
      currentLevelTag: 1,
      currentLevelBackground: 1,
      userId: 1,
      equippedStoreItems: 1,
      country: 1,
      createdAt: 1,
      currentBackground: "$currentLevelBackground",
      currentTag: "$currentLevelTag",
      currentLevel: "$level",
      // exclude: password, email, etc.
    },
  },
];

/**
 * Returns a $lookup stage that enriches a reference field (e.g. hostId, member, admin)
 * with full user data + equipped store items
 */
export const lookupRichUser = (localField: string, asField?: string) => ({
  $lookup: {
    from: DatabaseNames.User,
    let: { userRefId: `$${localField}` },
    pipeline: userWithEquippedItemsPipeline("userRefId"),
    as: asField || `${localField}Info`,
  },
});

/**
 * Creates a $lookup stage for an **array** of user IDs
 * (admins, roomPartners, membersArray, bannedUsers[*].user, etc.)
 */
export function lookupEnrichedUsersArray(
  localArrayField: string,
  outputFieldName?: string,
) {
  const asName = outputFieldName || `${localArrayField}Info`;

  return {
    $lookup: {
      from: DatabaseNames.User,
      let: { userIds: `$${localArrayField}` },
      pipeline: [
        {
          $match: {
            $expr: {
              $in: [
                "$_id",
                {
                  $map: {
                    input: { $ifNull: ["$$userIds", []] },
                    as: "id",
                    in: { $toObjectId: "$$id" },
                  },
                },
              ],
            },
          },
        },
        ...userWithEquippedItemsPipeline("userIds").slice(1),
      ],
      as: asName,
    },
  };
}

export const lookupRoom = (localField: string, asField?: string) => ({
  $lookup: {
    from: DatabaseNames.AudioRoom,
    let: { roomId: `$${localField}` },
    pipeline: [
      {
        $match: {
          $expr: {
            $eq: ["$roomId", "$$roomId"],
          },
        },
      },
      {
        $lookup: {
          from: DatabaseNames.User,
          localField: "hostId",
          foreignField: "_id",
          as: "hostInfo",
        },
      },
      {
        $unwind: {
          path: "$hostInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          roomPhoto: 1,
          roomName: "$title",
          hostLevel: { $ifNull: ["$hostInfo.level", 0] },
        },
      },
    ],
    as: asField || `${localField}Info`,
  },
});
