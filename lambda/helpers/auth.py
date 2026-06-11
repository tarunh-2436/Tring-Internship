def get_owner_information(event):

    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    groups = claims.get("cognito:groups", [])

    if isinstance(groups, str):
        groups = groups.strip("[]").split(",")
        groups = [g.strip() for g in groups if g.strip()]

    is_admin = "admins" in groups

    owner_id = claims.get("sub")

    return {
        "ownerId": owner_id,
        "ownerType": "AUTHENTICATED",
        "isAdmin": is_admin,
    }
