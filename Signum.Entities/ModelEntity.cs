﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Signum.Utilities;

namespace Signum.Entities
{
    [Serializable]
    public abstract class ModelEntity : EmbeddedEntity, IRootEntity
    {
        protected internal override void PreSaving(ref bool graphModified)
        {
        
        }

        protected internal override void PostRetrieving()
        {
            throw new InvalidOperationException("ModelEntities are not meant to be retrieved"); 
        }

        public static Implementations GetImplementations(PropertyRoute route)
        {
            if (!typeof(ModelEntity).IsAssignableFrom(route.RootType))
                throw new InvalidOperationException("Route {0} is not rooted on a {1}".Formato(route, typeof(ModifiableEntity).Name));

            PropertyRoute fieldRoute = route;
            if (fieldRoute.PropertyRouteType == PropertyRouteType.LiteEntity)
                fieldRoute = fieldRoute.Parent;

            if (fieldRoute.PropertyRouteType == PropertyRouteType.MListItems)
                fieldRoute = fieldRoute.Parent;

            return Implementations.FromAttributes(
                route.Type.CleanType(),
                fieldRoute.FieldInfo.GetCustomAttributes(true).Cast<Attribute>().ToArray(),
                route);
        }
    }
}
