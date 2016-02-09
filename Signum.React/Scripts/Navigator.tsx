﻿import * as React from "react"
import { Router, Route, Redirect, IndexRoute } from "react-router"
import { Dic, hasFlag } from './Globals';
import { ajaxGet, ajaxPost } from './Services';
import { openModal } from './Modals';
import { IEntity, Lite, Entity, ModifiableEntity, EmbeddedEntity, LiteMessage, EntityPack } from './Signum.Entities';
import { PropertyRoute, PseudoType, EntityKind, TypeInfo, IType, Type, getTypeInfo  } from './Reflection';
import { TypeContext } from './TypeContext';
import { EntityComponent, EntityComponentProps} from './Lines';
import * as Finder from './Finder';
import PopupFrame from './Frames/PopupFrame';


export let NotFound: __React.ComponentClass<any>;

export let currentUser: IEntity;
export let currentHistory: HistoryModule.History & HistoryModule.HistoryQueries;



export function start(options: { routes: JSX.Element[] }) {
    options.routes.push(<Route path="view/:type/:id" getComponent={(loc, cb) => require(["./Frames/PageFrame"], (Comp) => cb(null, Comp.default)) } ></Route>);
    options.routes.push(<Route path="create/:type" getComponent={(loc, cb) => require(["./Frames/PageFrame"], (Comp) => cb(null, Comp.default))} ></Route>);
}

export function getTypeName(pseudoType: IType | TypeInfo | string) {
    if ((pseudoType as IType).typeName)
        return (pseudoType as IType).typeName;

    if ((pseudoType as TypeInfo).name)
        return (pseudoType as TypeInfo).name;

    if (typeof pseudoType == "string")
        return pseudoType as string;

    throw new Error("Unexpected pseudoType " + pseudoType);
}


export function getTypeTitel(entity: Entity) {

    const typeInfo = getTypeInfo(entity.Type)

    return entity.isNew ?
        LiteMessage.New_G.niceToString().forGenderAndNumber(typeInfo.gender).formatWith(typeInfo.niceName) :
        typeInfo.niceName + " " + entity.id;
}


export function navigateRoute(entity: IEntity);
export function navigateRoute(lite: Lite<IEntity>);
export function navigateRoute(type: PseudoType, id: any);
export function navigateRoute(typeOfEntity: any, id: any = null) {
    let typeName: string;
    if ((typeOfEntity as IEntity).Type) {
        typeName = (typeOfEntity as IEntity).Type;
        id = (typeOfEntity as IEntity).id;
    }
    else if ((typeOfEntity as Lite<IEntity>).EntityType) {
        typeName = (typeOfEntity as Lite<IEntity>).EntityType;
        id = (typeOfEntity as Lite<IEntity>).id;
    }
    else {
        typeName = getTypeName(typeOfEntity as PseudoType);
    }

    return "/view/" + typeName[0].toLowerCase() + typeName.substr(1) + "/" + id;
}

export const entitySettings: { [type: string]: EntitySettingsBase } = {};

export function addSettings(...settings: EntitySettingsBase[]) {
    settings.forEach(s=> Dic.addOrThrow(entitySettings, s.type.typeName, s));
}


export function getSettings(type: PseudoType): EntitySettingsBase {
    const typeName = getTypeName(type);

    return entitySettings[typeName];
}


export const isCreableEvent: Array<(typeName: string) => boolean> = [];

export function isCreable(type: PseudoType, isSearch?: boolean) {

    const typeName = getTypeName(type);

    const es = entitySettings[typeName];
    if (!es)
        return true;

    if (isSearch != null && !es.onIsCreable(isSearch))
        return false;

    return isCreableEvent.every(f=> f(typeName));
}

export const isFindableEvent: Array<(typeName: string) => boolean> = []; 

export function isFindable(type: PseudoType, isSearch?: boolean) {

    const typeName = getTypeName(type);

    if (!Finder.isFindable(typeName))
        return false;

    const es = entitySettings[typeName];
    if (es && !es.onIsFindable())
        return false;

    return true;
}

export const isViewableEvent: Array<(typeName: string, entity?: ModifiableEntity) => boolean> = []; 

export function isViewable(typeOrEntity: PseudoType | ModifiableEntity, customView = false): boolean{
    const entity = (typeOrEntity as ModifiableEntity).Type ? typeOrEntity as ModifiableEntity : null;

    const typeName = entity ? entity.Type : getTypeName(typeOrEntity as PseudoType);

    const es = entitySettings[typeName];

    return es != null && es.onIsViewable(customView) && isViewableEvent.every(f=> f(typeName, entity));
}

export function isNavigable(typeOrEntity: PseudoType | ModifiableEntity, customView = false, isSearch = false): boolean {

    const entity = (typeOrEntity as ModifiableEntity).Type ? typeOrEntity as Entity : null;

    const typeName = entity ? entity.Type : getTypeName(typeOrEntity as PseudoType);

    const es = entitySettings[typeName];

    return es != null && es.onIsNavigable(customView, isSearch) && isViewableEvent.every(f=> f(typeName, entity));
}



export interface ViewOptions {
    entity: Lite<IEntity> | ModifiableEntity | EntityPack<ModifiableEntity>;
    propertyRoute?: PropertyRoute;
    readOnly?: boolean;
    showOperations?: boolean;
    saveProtected?: boolean;
    component?: React.ComponentClass<EntityComponentProps<any>>;
}

export function view(options: ViewOptions): Promise<ModifiableEntity>;
export function view<T extends ModifiableEntity>(entity: T, propertyRoute?: PropertyRoute): Promise<T>;
export function view<T extends IEntity>(entity: Lite<T>): Promise<T>
export function view(entityOrOptions: ViewOptions | ModifiableEntity | Lite<Entity>): Promise<ModifiableEntity>
{
    const options = (entityOrOptions as ModifiableEntity).Type ? { entity: entityOrOptions } as ViewOptions :
        (entityOrOptions as Lite<Entity>).EntityType ? { entity: entityOrOptions } as ViewOptions :
        (entityOrOptions as EntityPack<ModifiableEntity>).entity ? { entity: entityOrOptions } as ViewOptions :
            entityOrOptions as ViewOptions;

    return new Promise<ModifiableEntity>((resolve) => {
        require(["./Frames/PopupFrame"], function (NP: { default: typeof PopupFrame }) {
            NP.default.openView(options).then(resolve);
        });
    });
}


export interface NavigateOptions {
    entity: Lite<IEntity> | ModifiableEntity | EntityPack<ModifiableEntity>;
    readOnly?: boolean;
    component?: React.ComponentClass<EntityComponentProps<any>>;
}

export function navigate(options: NavigateOptions): Promise<ModifiableEntity>;
export function navigate<T extends ModifiableEntity>(entity: T, propertyRoute?: PropertyRoute): Promise<T>;
export function navigate<T extends IEntity>(entity: Lite<T>): Promise<T>
export function navigate(entityOrOptions: NavigateOptions | ModifiableEntity | Lite<Entity>): Promise<ModifiableEntity> {
    const options = (entityOrOptions as ModifiableEntity).Type ? { entity: entityOrOptions } as NavigateOptions :
        (entityOrOptions as Lite<Entity>).EntityType ? { entity: entityOrOptions } as NavigateOptions :
            (entityOrOptions as EntityPack<ModifiableEntity>).entity ? { entity: entityOrOptions } as NavigateOptions :
                entityOrOptions as NavigateOptions;

    return new Promise<ModifiableEntity>((resolve) => {
        require(["./Frames/PopupFrame"], function (NP: { default: typeof PopupFrame }) {
            NP.default.openView(options).then(resolve);
        });
    });
} 

export interface WidgetsContext {
    entity?: Entity;
    lite?: Lite<Entity>;
}

export function renderWidgets(ctx: WidgetsContext): React.ReactFragment {
    return null;
}

export function renderEmbeddedWidgets(ctx: WidgetsContext, position: EmbeddedWidgetPosition): React.ReactFragment {
    return null;
}

export enum EmbeddedWidgetPosition {
    Top, 
    Bottom,
}



export module API {

    export function fetchEntity<T extends Entity>(lite: Lite<T>): Promise<T>;
    export function fetchEntity<T extends Entity>(type: Type<T>, id: any): Promise<T>;
    export function fetchEntity<T extends Entity>(type: string, id: any): Promise<Entity>;
    export function fetchEntity(typeOrLite: PseudoType | Lite<any>, id?: any): Promise<Entity> {

        const typeName = (typeOrLite as Lite<any>).EntityType || getTypeName(typeOrLite as PseudoType);
        let idVal = (typeOrLite as Lite<any>).id || id;

        return ajaxGet<Entity>({ url: "/api/entity/" + typeName + "/" + idVal });
    }


    export function fetchEntityPack<T extends Entity>(lite: Lite<T>): Promise<EntityPack<T>>;
    export function fetchEntityPack<T extends Entity>(type: Type<T>, id: any): Promise<EntityPack<T>>;
    export function fetchEntityPack(type: PseudoType, id: any): Promise<EntityPack<Entity>>;
    export function fetchEntityPack(typeOrLite: PseudoType | Lite<any>, id?: any): Promise<EntityPack<Entity>> {

        const typeName = (typeOrLite as Lite<any>).EntityType || getTypeName(typeOrLite as PseudoType);
        let idVal = (typeOrLite as Lite<any>).id || id;

        return ajaxGet<EntityPack<Entity>>({ url: "/api/entityPack/" + typeName + "/" + idVal });
    }
}


export abstract class EntitySettingsBase {
    public type: IType;

    public avoidPopup: boolean;

    abstract onIsCreable(isSearch: boolean): boolean;
    abstract onIsFindable(): boolean;
    abstract onIsViewable(customView: boolean): boolean;
    abstract onIsNavigable(customView: boolean, isSearch: boolean): boolean;
    abstract onIsReadonly(): boolean;

    getToString: (entity: ModifiableEntity) => string; 

    abstract onGetComponent(entity: ModifiableEntity): Promise<React.ComponentClass<EntityComponentProps<any>>>;

    constructor(type: IType) {
        this.type = type;
    }
}

export class EntitySettings<T extends Entity> extends EntitySettingsBase {
    public type: Type<T>;

    isCreable: EntityWhen;
    isFindable: boolean;
    isViewable: boolean;
    isNavigable: EntityWhen;
    isReadOnly: boolean;

    getToString: (entity: T) => string;

    getComponent: (entity: T) => Promise<{ default: React.ComponentClass<EntityComponentProps<T>> }>;

    constructor(type: Type<T>, getComponent: (entity: T) => Promise<any>,
        options?: { isCreable?: EntityWhen, isFindable?: boolean; isViewable?: boolean; isNavigable?: EntityWhen; isReadOnly?: boolean }) {
        super(type);

        this.getComponent = getComponent;

        switch (type.typeInfo().entityKind) {
            case EntityKind.SystemString:
                this.isCreable = EntityWhen.Never;
                this.isFindable = true;
                this.isViewable = false;
                this.isNavigable = EntityWhen.Never;
                this.isReadOnly = true;
                break;

            case EntityKind.System:
                this.isCreable = EntityWhen.Never;
                this.isFindable = true;
                this.isViewable = true;
                this.isNavigable = EntityWhen.Always;
                this.isReadOnly = true;
                break;

            case EntityKind.Relational:
                this.isCreable = EntityWhen.Never;
                this.isFindable = false;
                this.isViewable = false;
                this.isNavigable = EntityWhen.Never;
                this.isReadOnly = true;
                break;

            case EntityKind.String:
                this.isCreable = EntityWhen.IsSearch;
                this.isFindable = true;
                this.isViewable = false;
                this.isNavigable = EntityWhen.IsSearch;
                break;

            case EntityKind.Shared:
                this.isCreable = EntityWhen.Always;
                this.isFindable = true;
                this.isViewable = true;
                this.isNavigable = EntityWhen.Always;
                break;

            case EntityKind.Main:
                this.isCreable = EntityWhen.IsSearch;
                this.isFindable = true;
                this.isViewable = true;
                this.isNavigable = EntityWhen.Always;
                break;

            case EntityKind.Part:
                this.isCreable = EntityWhen.IsLine;
                this.isFindable = false;
                this.isViewable = true;
                this.isNavigable = EntityWhen.Always;
                break;

            case EntityKind.SharedPart:
                this.isCreable = EntityWhen.IsLine;
                this.isFindable = true;
                this.isViewable = true;
                this.isNavigable = EntityWhen.Always;
                break;

            default:
                break;

        }

        Dic.extend(this, options);
    }

    onIsCreable(isSearch: boolean): boolean {
        return hasFlag(this.isCreable, isSearch ? EntityWhen.IsSearch : EntityWhen.IsLine);
    }


    onIsFindable(): boolean {
        return this.isFindable;
    }

    onIsViewable(customView: boolean): boolean {
        if (!this.getComponent && !customView)
            return false;

        return this.isViewable;
    }

    onIsNavigable(customView: boolean, isSearch: boolean): boolean {

        if (!this.getComponent && !customView)
            return false;

        return hasFlag(this.isNavigable, isSearch ? EntityWhen.IsSearch : EntityWhen.IsLine);
    }

    onIsReadonly(): boolean {
        return this.isReadOnly;
    }


    onGetComponent(entity: ModifiableEntity): Promise<React.ComponentClass<EntityComponentProps<T>>>{
        return this.getComponent(entity as T).then(a=> a.default);
    }
    
}

export class EmbeddedEntitySettings<T extends ModifiableEntity> extends EntitySettingsBase {
    public type: Type<T>;

    getComponent: (entity: T) => Promise<{ default: React.ComponentClass<EntityComponentProps<T>> }>;

    isCreable: boolean;
    isViewable: boolean;
    isReadOnly: boolean;

    getToString: (entity: T) => string;

    constructor(type: Type<T>, getComponent: (entity: T) => Promise<any>,
        options?: { isCreable?: boolean; isViewable?: boolean; isReadOnly?: boolean }) {
        super(type);

        this.getComponent = getComponent;

        Dic.extend(this, options);
    }

    onIsCreable(isSearch: boolean) {
        if (isSearch)
            throw new Error("EmbeddedEntitySettigs are not compatible with isSearch");

        return this.isCreable;
    }

    onIsFindable(): boolean {
        return false;
    }

    onIsViewable(customView: boolean): boolean {
        if (!this.getComponent && !customView)
            return false;

        return this.isViewable;
    }

    onIsNavigable(customView: boolean, isSearch: boolean): boolean {
        return false;
    }

    onIsReadonly(): boolean {
        return this.isReadOnly;
    }

    onGetComponent(entity: ModifiableEntity): Promise<React.ComponentClass<EntityComponentProps<T>>> {
        return this.getComponent(entity as T).then(a=> a.default);;
    }
}


export enum EntityWhen {
    Always = 3,
    IsSearch = 2,
    IsLine = 1,
    Never = 0,
}



