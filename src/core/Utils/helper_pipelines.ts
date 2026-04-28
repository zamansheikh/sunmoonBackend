import { DatabaseNames } from "./enums";
/**
 * Returns a sub-pipeline that:
 * - Matches a user by _id (using let variable)
 * - Looks up equipped store items
 * - Transforms them into { categoryName: { svgaUrl, previewUrl } } objects
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
                              v: {
                                svgaUrl: "$$b.svgaFile",
                                previewUrl: "$$b.previewFile",
                              },
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
                                  v: {
                                    svgaUrl: "$svgaFile",
                                    previewUrl: { $ifNull: ["$previewFile", ""] },
                                  },
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

  // Lookup all bucket items (regardless of useStatus) to find premium SVIP / VIP store items
  {
    $lookup: {
      from: DatabaseNames.MyBucketItem,
      let: { ownerId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$ownerId", "$$ownerId"] },
          },
        },
        // Join each bucket entry with its StoreItem, keeping only premium ones
        {
          $lookup: {
            from: DatabaseNames.StoreItem,
            let: { itemId: "$itemId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$_id", "$$itemId"] },
                      { $eq: ["$isPremium", true] },
                    ],
                  },
                },
              },
            ],
            as: "storeItem",
          },
        },
        // Discard bucket entries whose store item isn't premium
        {
          $unwind: {
            path: "$storeItem",
            preserveNullAndEmptyArrays: false,
          },
        },
        // Promote the store item as the document
        {
          $replaceRoot: { newRoot: "$storeItem" },
        },
      ],
      as: "premiumBucketItems",
    },
  },
  // Extract the first SVIP / VIP item, shaped to only: logo, name, svgaFile, previewFile
  // svgaFile and previewFile are taken from the bundleFiles entry where categoryName == "svga_tag"
  {
    $addFields: {
      svipItem: {
        $let: {
          vars: {
            raw: {
              $first: {
                $filter: {
                  input: "$premiumBucketItems",
                  as: "item",
                  cond: { $regexMatch: { input: "$$item.name", regex: "^SVIP" } },
                },
              },
            },
          },
          in: {
            $cond: {
              if: { $eq: ["$$raw", null] },
              then: null,
              else: {
                $let: {
                  vars: {
                    tagBundle: {
                      $first: {
                        $filter: {
                          input: { $ifNull: ["$$raw.bundleFiles", []] },
                          as: "b",
                          cond: { $eq: ["$$b.categoryName", "svga_tag"] },
                        },
                      },
                    },
                  },
                  in: {
                    name: "$$raw.name",
                    logo: "$$raw.logo",
                    svgaFile: { $ifNull: ["$$tagBundle.svgaFile", null] },
                    previewFile: { $ifNull: ["$$tagBundle.previewFile", null] },
                  },
                },
              },
            },
          },
        },
      },
      vipItem: {
        $let: {
          vars: {
            raw: {
              $first: {
                $filter: {
                  input: "$premiumBucketItems",
                  as: "item",
                  cond: { $regexMatch: { input: "$$item.name", regex: "^VIP" } },
                },
              },
            },
          },
          in: {
            $cond: {
              if: { $eq: ["$$raw", null] },
              then: null,
              else: {
                $let: {
                  vars: {
                    tagBundle: {
                      $first: {
                        $filter: {
                          input: { $ifNull: ["$$raw.bundleFiles", []] },
                          as: "b",
                          cond: { $eq: ["$$b.categoryName", "svga_tag"] },
                        },
                      },
                    },
                  },
                  in: {
                    name: "$$raw.name",
                    logo: "$$raw.logo",
                    svgaFile: { $ifNull: ["$$tagBundle.svgaFile", null] },
                    previewFile: { $ifNull: ["$$tagBundle.previewFile", null] },
                  },
                },
              },
            },
          },
        },
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
      svipItem: 1,
      vipItem: 1,
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
                    input: {
                      $filter: {
                        input: { $ifNull: ["$$userIds", []] },
                        as: "id",
                        cond: { $and: [{ $ne: ["$$id", null] }, { $ne: ["$$id", ""] }] },
                      },
                    },
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
