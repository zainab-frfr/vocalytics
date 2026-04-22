from flask import Blueprint, jsonify, request

dashboards_bp = Blueprint("dashboards", __name__)

@dashboards_bp.route("/templates", methods=["GET"])
def list_templates():
    return jsonify({"templates": []})


@dashboards_bp.route("/", methods=["GET"])
def list_dashboards():
    return jsonify({"dashboards": []})


@dashboards_bp.route("/<id>", methods=["GET"])
def get_dashboard(id):
    return jsonify({"dashboard_id": id})


@dashboards_bp.route("/from-template", methods=["POST", "OPTIONS"])
def from_template():
    data = request.json
    return jsonify({
        "message": "dashboard created from template",
        "data": data
    })


@dashboards_bp.route("/auto-generate", methods=["POST", "OPTIONS"])
def auto_generate():
    data = request.json
    return jsonify({
        "message": "dashboard auto generated",
        "data": data
    })


@dashboards_bp.route("/<dashboard_id>/widgets/<widget_id>/data", methods=["GET"])
def widget_data(dashboard_id, widget_id):
    return jsonify({
        "dashboard_id": dashboard_id,
        "widget_id": widget_id,
        "data": []
    })


@dashboards_bp.route("/<id>", methods=["DELETE"])
def delete_dashboard(id):
    return jsonify({"deleted": id})