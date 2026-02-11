import { DatabaseNames } from "./enums";
/**
 * Returns a sub-pipeline that:
 * - Matches a user by _id (using let variable)
 * - Looks up equipped store items
 * - Transforms them into the desired { categoryName: svgaFile } object
 * - Returns a clean user object with equipedStoreItems field
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
                  transformedItem: {
                    $cond: {
                      if: { $gt: [{ $size: "$bundleFiles" }, 0] },
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
                            $arrayToObject: [
                              {
                                k: { $ifNull: ["$category.title", "Unknown"] },
                                v: "$svgaFile",
                              },
                            ],
                          },
                          else: {},
                        },
                      },
                    },
                  },
                },
              },
              {
                $replaceRoot: { newRoot: "$transformedItem" },
              },
            ],
            as: "equipedItem",
          },
        },
        {
          $unwind: {
            path: "$equipedItem",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: { newRoot: "$equipedItem" },
        },
      ],
      as: "equipedStoreItems",
    },
  },
  {
    $addFields: {
      equipedStoreItems: {
        $mergeObjects: "$equipedStoreItems",
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
      equipedStoreItems: 1,
      createdAt: 1,
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
