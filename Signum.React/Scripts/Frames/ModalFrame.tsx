﻿
import * as React from 'react'
import { Modal, ModalProps, ModalClass, ButtonToolbar, Button } from 'react-bootstrap'
import { openModal, IModalProps } from '../Modals'
import * as Navigator from '../Navigator'
import { EntityFrame, EntityComponentProps } from '../Lines'
import ButtonBar from './ButtonBar'

import { TypeContext, StyleOptions } from '../TypeContext'
import { Entity, Lite, ModifiableEntity, JavascriptMessage, NormalWindowMessage, toLite, getToString, EntityPack, ModelState } from '../Signum.Entities'
import { getTypeInfo, TypeInfo, PropertyRoute, ReadonlyBinding, GraphExplorer } from '../Reflection'
import ValidationErrors from './ValidationErrors'
import { renderWidgets, WidgetContext } from './Widgets'
import { needsCanExecute } from '../Operations/EntityOperations'

require("!style!css!./Frames.css");

interface ModalFrameProps extends React.Props<ModalFrame>, IModalProps {
    title?: string;
    entityOrPack?: Lite<Entity> | ModifiableEntity | EntityPack<ModifiableEntity>;
    propertyRoute?: PropertyRoute;
    showOperations?: boolean;
    requiresSaveOperation?: boolean;
    getComponent?: (ctx: TypeContext<ModifiableEntity>, frame: EntityFrame<ModifiableEntity>) => React.ReactElement<any>;
    isNavigate?: boolean;
    readOnly?: boolean
}

interface ModalFrameState {
    pack?: EntityPack<ModifiableEntity>;
    getComponent?: (ctx: TypeContext<ModifiableEntity>, frame: EntityFrame<ModifiableEntity>) => React.ReactElement<any>;
    entitySettings?: Navigator.EntitySettingsBase<any>;
    propertyRoute?: PropertyRoute;
    savedEntity?: string;
    show?: boolean;
}

export default class ModalFrame extends React.Component<ModalFrameProps, ModalFrameState>  {

    static defaultProps: ModalFrameProps = {
        showOperations: true,
        getComponent: null,
    }

    constructor(props) {
        super(props);
        this.state = this.calculateState(props);

    }

    componentWillMount() {
        Navigator.toEntityPack(this.props.entityOrPack, this.props.showOperations)
            .then(ep => this.setPack(ep))
            .then(() => this.loadComponent())
            .done();
    }

    componentWillReceiveProps(props) {
        this.setState(this.calculateState(props));

        Navigator.toEntityPack(props.entityOrPack, this.props.showOperations)
            .then(ep => this.setPack(ep))
            .then(() => this.loadComponent())
            .done();
    }

    calculateState(props: ModalFrameState): ModalFrameState {

        const typeName = (this.props.entityOrPack as Lite<Entity>).EntityType ||
            (this.props.entityOrPack as ModifiableEntity).Type ||
            (this.props.entityOrPack as EntityPack<ModifiableEntity>).entity.Type;

        const entitySettings = Navigator.getSettings(typeName);

        const typeInfo = getTypeInfo(typeName);

        const pr = typeInfo ? PropertyRoute.root(typeInfo) : this.props.propertyRoute;

        if (!pr)
            throw new Error("propertyRoute is mandatory for embeddedEntities");

        return {
            entitySettings: entitySettings,
            propertyRoute: pr,
            show: true,
        };
    }



    setPack(pack: EntityPack<ModifiableEntity>): void {
        this.setState({
            pack: pack,
            savedEntity: JSON.stringify(pack.entity),
        });
    }

    loadComponent() {

        if (this.props.getComponent) {
            this.setState({ getComponent: this.props.getComponent });
            return Promise.resolve(null);
        }
        
        return this.state.entitySettings.onGetComponent(this.state.pack.entity)
            .then(c => this.setState(
            {
                getComponent: (ctx, frame) => React.createElement(c, {
                    ctx: ctx,
                    frame: frame
                })
            }))
            .done();
    }

    okClicked: boolean;
    handleOkClicked = (val: any) => {
        if (this.hasChanges() && this.props.requiresSaveOperation) {
            alert(JavascriptMessage.saveChangesBeforeOrPressCancel.niceToString());
            return;
        }

        this.okClicked = true;
        this.setState({ show: false });
    }

    handleCancelClicked = () => {
        
        if (this.state.pack.entity.modified) {
            if (!confirm(NormalWindowMessage.LoseChanges.niceToString()))
                return;
        }

        this.setState({ show: false });
    }

    hasChanges() {

        var entity = this.state.pack.entity;

        GraphExplorer.propagateAll(entity);

        var hasChanges = JSON.stringify(entity) != this.state.savedEntity;
        
        if (hasChanges != entity.modified)
            throw new Error(`The entity.modified=${this.state.pack.entity.modified} but ${hasChanges ? "has" : "has no"} changes`);

        return entity.modified;
    }

    handleOnExited = () => {
        this.props.onExited(this.okClicked ? this.state.pack.entity : null);
    }

    render() {

        var pack = this.state.pack;

        return (
            <Modal bsSize="lg" onHide={this.handleCancelClicked} show={this.state.show} onExited={this.handleOnExited} className="sf-popup-control">
                <Modal.Header closeButton={this.props.isNavigate}>
                    {!this.props.isNavigate && <ButtonToolbar style={{ float: "right" }}>
                        <Button className="sf-entity-button sf-close-button sf-ok-button" bsStyle="primary" disabled={!pack} onClick={this.handleOkClicked}>{JavascriptMessage.ok.niceToString() }</Button>
                        <Button className="sf-entity-button sf-close-button sf-cancel-button" bsStyle="default" disabled={!pack} onClick={this.handleCancelClicked}>{JavascriptMessage.cancel.niceToString() }</Button>
                    </ButtonToolbar>}
                    {this.renderTitle() }
                </Modal.Header>
                {pack && this.renderBody() }  
            </Modal>
        );
    }

    renderBody() {

        var frame: EntityFrame<Entity> = {
            onReload: pack => this.setPack(pack),
            onClose: () => this.props.onExited(null),
            setError: (modelState, initialPrefix = "") => {
                GraphExplorer.setModelState(this.state.pack.entity, modelState, initialPrefix);
                this.forceUpdate();
            },
        };

        const styleOptions: StyleOptions = {
            readOnly: this.props.readOnly != null ? this.props.readOnly : this.state.entitySettings.onIsReadonly()
        };

        var pack = this.state.pack;

        var ctx =  new TypeContext<Entity>(null, styleOptions, this.state.propertyRoute, new ReadonlyBinding(pack.entity));

        return (
            <Modal.Body>
                {renderWidgets({ ctx: ctx, pack: pack }) }
                <ButtonBar frame={frame} pack={pack} showOperations={this.props.showOperations} />
                <ValidationErrors entity={pack.entity}/>
                <div className="sf-main-control form-horizontal" data-test-ticks={new Date().valueOf() }>
                    { this.state.getComponent && this.state.getComponent(ctx, frame) }
                </div>
            </Modal.Body>
        );
    }


    renderTitle() {
        
        if (!this.state.pack)
            return <h3>{JavascriptMessage.loading.niceToString() }</h3>;

        const entity = this.state.pack.entity;
        const pr = this.props.propertyRoute;

        return (
            <h4>
                <span className="sf-entity-title">{this.props.title || getToString(entity) }</span>&nbsp;
                {this.renderExpandLink() }
                <br />
                <small> {pr && pr.member && pr.member.typeNiceName || Navigator.getTypeTitle(entity, pr) }</small>
            </h4>
        );
    }

    renderExpandLink() {
        const entity = this.state.pack.entity;

        if (entity == null)
            return null;

        const ti = getTypeInfo(entity.Type);

        if (ti == null || !Navigator.isNavigable(ti, null)) //Embedded
            return null;

        return (
            <a href={ Navigator.navigateRoute(entity) } className="sf-popup-fullscreen" onClick={this.handlePopupFullScreen}>
                <span className="glyphicon glyphicon-new-window"></span>
            </a>
        );
    }

    handlePopupFullScreen = (e: React.MouseEvent) => {

        if (e.ctrlKey || e.buttons) {

        } else {

            Navigator.currentHistory.push(Navigator.navigateRoute(this.state.pack.entity));

            e.preventDefault();
        }
    }

    static openView(options: Navigator.ViewOptions): Promise<Entity> {

        return openModal<Entity>(<ModalFrame
            entityOrPack={options.entity}
            readOnly={options.readOnly}
            propertyRoute={options.propertyRoute}
            getComponent={options.getComponent}
            showOperations={options.showOperations}
            requiresSaveOperation={options.requiresSaveOperation}
            isNavigate={false}/>);
    }

    static openNavigate(options: Navigator.NavigateOptions): Promise<void> {

        return openModal<void>(<ModalFrame
            entityOrPack={options.entity}
            readOnly={options.readOnly}
            propertyRoute={null}
            getComponent={options.getComponent}
            showOperations={null}
            requiresSaveOperation={null}
            isNavigate={true}/>);
    }
}



