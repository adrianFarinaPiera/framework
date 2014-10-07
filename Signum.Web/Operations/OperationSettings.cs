#region usings
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.Mvc;
using Signum.Entities;
using System.Web;
using Signum.Utilities;
using Signum.Entities.Basics;
using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using Signum.Utilities.ExpressionTrees;
#endregion

namespace Signum.Web.Operations
{
    public abstract class OperationSettings
    {
        public OperationSettings(IOperationSymbolContainer symbol)
        {
            this.OperationSymbol = symbol.Symbol; 
        }

        public OperationSymbol OperationSymbol { get; private set; }

        public abstract Type OverridenType { get; }

        public string Text { get; set; }

        public override string ToString()
        {
            return "{0}({1})".Formato(this.GetType().TypeName(), OperationSymbol.Key);
        }
    }

    #region ConstructorOperation
    public abstract class ConstructorOperationSettingsBase : OperationSettings
    {
        public abstract bool HasIsVisible { get; }
        public abstract bool OnIsVisible(IClientConstructorOperationContext ctx);

        public abstract bool HasConstructor { get; }
        public abstract IdentifiableEntity OnConstructor(IConstructorOperationContext ctx);

        public abstract bool HasClientConstructor { get; }
        public abstract JsFunction OnClientConstructor(IClientConstructorOperationContext ctx);

        protected ConstructorOperationSettingsBase(IOperationSymbolContainer constructOperation)
            : base(constructOperation)
        {

        }
    }

    public class ConstructorOperationSettings<T> : ConstructorOperationSettingsBase where T : class, IIdentifiable
    {
        public Func<ClientConstructorOperationContext<T>, bool> IsVisible { get; set; }
        public Func<ClientConstructorOperationContext<T>, JsFunction> ClientConstructor { get; set; }

        public Func<ConstructorOperationContext<T>, T> Constructor { get; set; }

        public ConstructorOperationSettings(ConstructSymbol<T>.Simple constructOperation)
            : base(constructOperation)
        {
        }

        public override bool HasIsVisible { get { return IsVisible != null; } }

        public override bool OnIsVisible(IClientConstructorOperationContext ctx)
        {
            return IsVisible((ClientConstructorOperationContext<T>)ctx);
        }

        public override bool HasClientConstructor { get { return ClientConstructor != null; } }

        public override JsFunction OnClientConstructor(IClientConstructorOperationContext ctx)
        {
            return ClientConstructor((ClientConstructorOperationContext<T>)ctx);
        }

        public override bool HasConstructor { get { return Constructor != null; } }

        public override IdentifiableEntity OnConstructor(IConstructorOperationContext ctx)
        {
            return (IdentifiableEntity)(IIdentifiable)Constructor((ConstructorOperationContext<T>)ctx);
        }

     

        public override Type OverridenType
        {
            get { return typeof(T); }
        }
    }

    public interface IClientConstructorOperationContext
    {
        OperationInfo OperationInfo { get; }
        ClientConstructorContext ClientConstructorContext { get; }
        ConstructorOperationSettingsBase Settings { get; }
    }

    public class ClientConstructorOperationContext<T> : IClientConstructorOperationContext where T : class, IIdentifiable
    {
        public OperationInfo OperationInfo { get; private set; }
        public ClientConstructorContext ClientConstructorContext { get; private set; }
        public ConstructorOperationSettings<T> Settings { get; private set; }

        public ClientConstructorOperationContext(OperationInfo info, ClientConstructorContext clientContext, ConstructorOperationSettings<T> settings)
        {
            this.OperationInfo = info;
            this.ClientConstructorContext = clientContext;
            this.Settings = settings;
        }

        ConstructorOperationSettingsBase IClientConstructorOperationContext.Settings
        {
            get { return Settings; }
        }
    }

    public interface IConstructorOperationContext
    {
        OperationInfo OperationInfo { get; }
        ConstructorContext ConstructorContext { get; }
        ConstructorOperationSettingsBase Settings { get; }
    }

    public class ConstructorOperationContext<T> : IConstructorOperationContext where T : class, IIdentifiable
    {
        public OperationInfo OperationInfo { get; private set; }
        public ConstructorContext ConstructorContext { get; private set; }
        public ConstructorOperationSettings<T> Settings { get; private set; }

        public ConstructorOperationContext(OperationInfo info, ConstructorContext context, ConstructorOperationSettings<T> settings)
        {
            this.OperationInfo = info;
            this.ConstructorContext = context;
            this.Settings = settings;
        }

        ConstructorOperationSettingsBase IConstructorOperationContext.Settings
        {
            get { return Settings; }
        }
    }
    #endregion

    public abstract class ContextualOperationSettingsBase : OperationSettings
    {
        public double Order { get; set; }

        public abstract bool HasClick { get; }
        public abstract JsFunction OnClick(IContextualOperationContext ctx);

        public abstract bool HasIsVisible { get; }
        public abstract bool OnIsVisible(IContextualOperationContext ctx);

        protected ContextualOperationSettingsBase(IOperationSymbolContainer constructOperation)
            : base(constructOperation)
        {
        }
    }

    public class ContextualOperationSettings<T> : ContextualOperationSettingsBase where T : class, IIdentifiable
    {
        public ContextualOperationSettings(IConstructFromManySymbolContainer<T> symbolContainer)
            : base(symbolContainer)
        {
        }


        internal ContextualOperationSettings(IEntityOperationSymbolContainer<T> symbolContainer)
            : base(symbolContainer)
        {
        }

        public Func<ContextualOperationContext<T>, bool> IsVisible { get; set; }
        public Func<ContextualOperationContext<T>, string> ConfirmMessage { get; set; }
        public Func<ContextualOperationContext<T>, JsFunction> Click { get; set; }

        public override bool HasIsVisible
        {
            get { return IsVisible != null; }
        }

        public override bool OnIsVisible(IContextualOperationContext ctx)
        {
            return IsVisible((ContextualOperationContext<T>)ctx);
        }

        public override bool HasClick
        {
            get { return Click != null; }
        }

        public override JsFunction OnClick(IContextualOperationContext ctx)
        {
            return Click((ContextualOperationContext<T>)ctx);
        }

        public override Type OverridenType
        {
            get { return typeof(T); }
        }
    }

    public interface IContextualOperationContext
    {
        OperationInfo OperationInfo { get; }
        string CanExecute { get; set; }
        ContextualOperationSettingsBase OperationSettings { get; }
        SelectedItemsMenuContext Context { get; }

        Type Type { get; }

        JsOperationOptions Options();
    }

    public class ContextualOperationContext<T> : IContextualOperationContext 
        where T : class, IIdentifiable
    {

        public List<Lite<T>> Entities { get; private set; }
        public Type SingleType { get { return Entities.Select(a => a.EntityType).Distinct().Only(); } }

        public OperationInfo OperationInfo { get; private set; }
        public ContextualOperationSettings<T> OperationSettings { get; set; }

        public SelectedItemsMenuContext Context { get; private set; }
        public string Prefix { get { return Context.Prefix; } }    
        public UrlHelper Url { get { return Context.Url; } }
        public object QueryName { get { return Context.QueryName; } }

        public string CanExecute { get; set; }

        public ContextualOperationContext(SelectedItemsMenuContext ctx, OperationInfo info, ContextualOperationSettings<T> settings)
        {
            this.Context = ctx;
            this.OperationInfo = info;
            this.OperationSettings = settings;
            this.Entities = Context.Lites.Cast<Lite<T>>().ToList();
        }

        public JsOperationOptions Options()
        {
            var result = new JsOperationOptions(OperationInfo.OperationSymbol, this.Prefix) { isLite = OperationInfo.Lite };

            result.confirmMessage = OperationSettings != null && OperationSettings.ConfirmMessage != null ? OperationSettings.ConfirmMessage(this) :
                OperationInfo.OperationType == OperationType.Delete ? OperationMessage.PleaseConfirmYouDLikeToDeleteTheSelectedEntitiesFromTheSystem.NiceToString() : null;

            return result;
        }

        ContextualOperationSettingsBase IContextualOperationContext.OperationSettings
        {
            get { return OperationSettings; }
        }

        public Type Type
        {
            get { return typeof(T); }
        }
    }

    public class EntityOperationGroup
    {
        public static readonly EntityOperationGroup None = new EntityOperationGroup();

        public static EntityOperationGroup Create = new EntityOperationGroup
        {
            Description = () => OperationMessage.Create.NiceToString(),
            SimplifyName = cs => Regex.Replace(cs, OperationMessage.CreateFromRegex.NiceToString(), m => m.Groups[1].Value.FirstUpper(), RegexOptions.IgnoreCase),
            CssClass = "sf-operation"
        };

        public Func<string> Description;
        public Func<string, string> SimplifyName;
        public string CssClass;
        public double Order = 100;
    }

    public abstract class EntityOperationSettingsBase : OperationSettings
    {
        public double Order { get; set; }

        public abstract ContextualOperationSettingsBase ContextualUntyped { get; }
        public abstract ContextualOperationSettingsBase ContextualFromManyUntyped { get; }
       
        public EntityOperationGroup Group { get; set; }

        public abstract bool HasClick { get; }
        public abstract JsFunction OnClick(IEntityOperationContext ctx);

        public abstract bool HasIsVisible { get; }
        public abstract bool OnIsVisible(IEntityOperationContext ctx);

        public EntityOperationSettingsBase(IOperationSymbolContainer symbol)
            : base(symbol)
        {
        }

        public static Func<OperationInfo, BootstrapStyle> Style { get; set; }
    }

    public class EntityOperationSettings<T> : EntityOperationSettingsBase where T : class, IIdentifiable
    {
        public ContextualOperationSettings<T> ContextualFromMany { get; private set; }
        public ContextualOperationSettings<T> Contextual { get; private set; }

        public EntityOperationSettings(IEntityOperationSymbolContainer<T> symbolContainer)
            : base(symbolContainer)
        {
            this.Contextual = new ContextualOperationSettings<T>(symbolContainer);
            this.ContextualFromMany = new ContextualOperationSettings<T>(symbolContainer); 
        }

        static EntityOperationSettings()
        {
            Style = oi => oi.OperationType == OperationType.Delete ? BootstrapStyle.Danger :
                oi.OperationType == OperationType.Execute && oi.OperationSymbol.Key.EndsWith(".Save") ? BootstrapStyle.Primary :
                BootstrapStyle.Default;
        }

        public Func<EntityOperationContext<T>, bool> IsVisible { get; set; }
        public Func<EntityOperationContext<T>, JsFunction> Click { get; set; }
        public Func<EntityOperationContext<T>, string> ConfirmMessage { get; set; }

        public override bool HasIsVisible
        {
            get { return IsVisible != null; }
        }

        public override bool OnIsVisible(IEntityOperationContext ctx)
        {
            return IsVisible((EntityOperationContext<T>)ctx);
        }

        public override bool HasClick
        {
            get { return Click != null; }
        }

        public override JsFunction OnClick(IEntityOperationContext ctx)
        {
            return Click((EntityOperationContext<T>)ctx);
        }

        public override Type OverridenType
        {
            get { return typeof(T); }
        }

        public override ContextualOperationSettingsBase ContextualUntyped
        {
            get { return Contextual; }
        }

        public override ContextualOperationSettingsBase ContextualFromManyUntyped
        {
            get { return ContextualFromMany; }
        }
    }

    public interface IEntityOperationContext
    {
        EntityButtonContext Context { get; }

        OperationInfo OperationInfo { get; }
        IIdentifiable Entity { get; }
        EntityOperationSettingsBase OperationSettings { get; }
        string CanExecute { get; set; }

        JsOperationOptions Options();
    }

    public class EntityOperationContext<T> : IEntityOperationContext where T : class, IIdentifiable
    {
        public EntityButtonContext Context { get; private set; }
        public UrlHelper Url { get { return Context.Url; } }
        public string PartialViewName { get { return Context.PartialViewName; } }
        public string Prefix { get { return Context.Prefix; } }
        public ViewMode ViewMode { get { return Context.ViewMode; } }
        public bool ShowOperations { get { return Context.ShowOperations; } }

        public OperationInfo OperationInfo { get; private set; }
        public EntityOperationSettings<T> OperationSettings { get; private set; }

        public T Entity { get; private set; }
        public string CanExecute { get; set; }

        public EntityOperationContext(T entity, OperationInfo operationInfo, EntityButtonContext context, EntityOperationSettings<T> settings)
        {
            Entity = entity;
            OperationInfo = operationInfo;
            Context = context;
            OperationSettings = settings;
        }

        public JsOperationOptions Options()
        {
            var result = new JsOperationOptions(OperationInfo.OperationSymbol, this.Prefix) { isLite = OperationInfo.Lite };

            result.confirmMessage = OperationSettings != null && OperationSettings.ConfirmMessage != null ? OperationSettings.ConfirmMessage(this) :
                OperationInfo.OperationType == OperationType.Delete ? OperationMessage.PleaseConfirmYouDLikeToDeleteTheEntityFromTheSystem.NiceToString() : null;

            return result;
        }

        public override string ToString()
        {
            return OperationInfo.ToString();
        }


        public string Compose(string prefixPart)
        {
            return TypeContextUtilities.Compose(this.Prefix, prefixPart); 
        }


        IIdentifiable IEntityOperationContext.Entity
        {
            get { return this.Entity; }
        }

        EntityOperationSettingsBase IEntityOperationContext.OperationSettings
        {
            get { return this.OperationSettings; }
        }
    }

   

    public class JsOperationOptions
    {
        public JsOperationOptions(OperationSymbol operation, string prefix)
        {
            this.operationKey = operation.Key;
            this.prefix = prefix;
        }

        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string operationKey;
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string prefix;
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public bool? isLite;
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string confirmMessage;
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string controllerUrl; 
    }
}
